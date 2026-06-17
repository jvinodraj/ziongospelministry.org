const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fs = require("fs/promises");
const path = require("path");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 8787);
const defaultAllowedOrigins = [
  "https://ziongospelministry.org",
  "https://www.ziongospelministry.org",
  "https://ziongospelministry.pages.dev",
  "http://127.0.0.1:4177",
  "http://localhost:4177"
];

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const origins = allowedOrigins.length ? allowedOrigins : defaultAllowedOrigins;
const allowAllOrigins = origins.includes("*");
const repoRoot = path.resolve(__dirname, "..");
const bibleBooksMetaPath = path.join(repoRoot, "assets", "data", "bible-books.json");
const userStateDir = path.join(__dirname, "data");
const userStatePath = path.join(userStateDir, "bible-user-state.json");
const bibleChapterCache = new Map();

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (_err) {
    return "";
  }
}

function addWwwVariant(origin) {
  try {
    const url = new URL(origin);
    if (url.hostname.startsWith("www.")) return origin;
    if (url.hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return origin;
    url.hostname = `www.${url.hostname}`;
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (_err) {
    return origin;
  }
}

const normalizedOriginSet = new Set();
origins.forEach((origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return;
  normalizedOriginSet.add(normalized);
  normalizedOriginSet.add(addWwwVariant(normalized));
});

app.use(cors({
  origin(origin, callback) {
    if (allowAllOrigins) {
      callback(null, true);
      return;
    }

    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedRequestOrigin = normalizeOrigin(origin);
    if (normalizedOriginSet.has(normalizedRequestOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed: ${origin}`));
  }
}));

app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "zion-contact-api", health: "/api/health" });
});

async function readJsonFile(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (_err) {
    return fallback;
  }
}

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function normalizeBookPayload(payload, bookName) {
  if (payload && payload.book && Array.isArray(payload.chapters)) {
    const chapterMap = {};
    payload.chapters.forEach((ch) => {
      const chapterNum = String(ch.chapter || "");
      if (!chapterNum) return;
      chapterMap[chapterNum] = chapterMap[chapterNum] || {};
      (ch.verses || []).forEach((verse) => {
        chapterMap[chapterNum][String(verse.verse)] = String(verse.text || "");
      });
    });
    return chapterMap;
  }

  if (payload && payload[bookName] && typeof payload[bookName] === "object") {
    return payload[bookName];
  }

  return payload && typeof payload === "object" ? payload : {};
}

function numericSort(a, b) {
  return Number(a) - Number(b);
}

function sanitizeUserId(input) {
  const userId = String(input || "").trim();
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(userId)) return "anonymous";
  return userId;
}

function defaultUserBibleState() {
  return {
    bookmarks: [],
    progress: {},
    plans: {},
    recents: []
  };
}

async function getBooksMeta() {
  return readJsonFile(bibleBooksMetaPath, []);
}

async function getBookMetaBySlug(bookSlug) {
  const books = await getBooksMeta();
  return books.find((book) => book.slug === bookSlug) || null;
}

async function getBookChapters(bookSlug) {
  if (bibleChapterCache.has(bookSlug)) return bibleChapterCache.get(bookSlug);

  const book = await getBookMetaBySlug(bookSlug);
  if (!book) return null;

  const sourcePath = path.join(repoRoot, "bible-data", book.file);
  const payload = await readJsonFile(sourcePath, null);
  if (!payload) return null;

  const chapterMap = normalizeBookPayload(payload, book.name);
  bibleChapterCache.set(bookSlug, chapterMap);
  return chapterMap;
}

async function getAllUserState() {
  return readJsonFile(userStatePath, {});
}

async function saveAllUserState(payload) {
  await writeJsonFile(userStatePath, payload);
}

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const portNumber = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP configuration.");
  }

  return nodemailer.createTransport({
    host,
    port: portNumber,
    secure,
    auth: { user, pass }
  });
}

function validatePayload(body) {
  const payload = {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim(),
    subject: String(body.subject || "").trim(),
    message: String(body.message || "").trim()
  };

  if (!payload.name || !payload.email || !payload.message) {
    return { error: "Name, email, and message are required." };
  }

  if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
    return { error: "Invalid email address." };
  }

  if (payload.message.length > 8000) {
    return { error: "Message is too long." };
  }

  return { payload };
}

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/bible/books", async (_req, res) => {
  const books = await getBooksMeta();
  res.status(200).json({ ok: true, items: books });
});

app.get("/api/bible/search", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const scope = String(req.query.scope || "all").toLowerCase();
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

  if (!q) {
    res.status(400).json({ ok: false, error: "Search query q is required." });
    return;
  }

  const books = (await getBooksMeta()).filter((book) => {
    if (scope === "ot") return book.testament === "ot";
    if (scope === "nt") return book.testament === "nt";
    return true;
  });

  const matches = [];
  for (const book of books) {
    const chapters = await getBookChapters(book.slug);
    if (!chapters) continue;

    for (const [chapterNum, verses] of Object.entries(chapters)) {
      for (const [verseNum, text] of Object.entries(verses || {})) {
        const verseText = String(text || "");
        if (!verseText.toLowerCase().includes(q)) continue;
        matches.push({
          book: book.name,
          bookSlug: book.slug,
          chapter: Number(chapterNum),
          verse: Number(verseNum),
          text: verseText
        });
      }
    }
  }

  const total = matches.length;
  const start = (page - 1) * limit;
  const items = matches.slice(start, start + limit);
  res.status(200).json({ ok: true, query: q, scope, page, limit, total, items });
});

app.get("/api/bible/audio/:bookSlug/:chapter", async (req, res) => {
  const book = await getBookMetaBySlug(req.params.bookSlug);
  const chapter = Number(req.params.chapter || 0);
  if (!book || !chapter || chapter < 1 || chapter > book.chapters) {
    res.status(404).json({ ok: false, error: "Audio chapter not found." });
    return;
  }

  res.status(200).json({
    ok: true,
    book: book.name,
    chapter,
    sourceType: "tts",
    streamUrl: null,
    supportsBackgroundPlayback: true,
    supportsVerseTiming: false,
    cues: []
  });
});

app.get("/api/bible/:bookSlug", async (req, res) => {
  const book = await getBookMetaBySlug(req.params.bookSlug);
  if (!book) {
    res.status(404).json({ ok: false, error: "Book not found." });
    return;
  }

  const chapters = await getBookChapters(book.slug);
  const chapterNumbers = Object.keys(chapters || {}).sort(numericSort).map(Number);
  res.status(200).json({ ok: true, item: { ...book, chapterNumbers } });
});

app.get("/api/bible/:bookSlug/:chapter", async (req, res) => {
  const book = await getBookMetaBySlug(req.params.bookSlug);
  const chapter = Number(req.params.chapter || 0);
  if (!book || !chapter) {
    res.status(404).json({ ok: false, error: "Chapter not found." });
    return;
  }

  const chapters = await getBookChapters(book.slug);
  const chapterMap = chapters ? chapters[String(chapter)] : null;
  if (!chapterMap) {
    res.status(404).json({ ok: false, error: "Chapter not found." });
    return;
  }

  const verses = Object.keys(chapterMap)
    .sort(numericSort)
    .map((verse) => ({ verse: Number(verse), text: String(chapterMap[verse] || "") }));

  res.status(200).json({
    ok: true,
    item: {
      book: book.name,
      bookSlug: book.slug,
      chapter,
      verses
    }
  });
});

app.get("/api/bible/:bookSlug/:chapter/:verse", async (req, res) => {
  const book = await getBookMetaBySlug(req.params.bookSlug);
  const chapter = Number(req.params.chapter || 0);
  const verse = Number(req.params.verse || 0);

  if (!book || !chapter || !verse) {
    res.status(404).json({ ok: false, error: "Verse not found." });
    return;
  }

  const chapters = await getBookChapters(book.slug);
  const text = chapters && chapters[String(chapter)] ? chapters[String(chapter)][String(verse)] : null;
  if (!text) {
    res.status(404).json({ ok: false, error: "Verse not found." });
    return;
  }

  res.status(200).json({
    ok: true,
    item: {
      book: book.name,
      bookSlug: book.slug,
      chapter,
      verse,
      text: String(text)
    }
  });
});

app.get("/api/user/:userId/bible/state", async (req, res) => {
  const userId = sanitizeUserId(req.params.userId);
  const allState = await getAllUserState();
  res.status(200).json({ ok: true, userId, item: allState[userId] || defaultUserBibleState() });
});

app.patch("/api/user/:userId/bible/state", async (req, res) => {
  const userId = sanitizeUserId(req.params.userId);
  const patch = req.body || {};

  const allState = await getAllUserState();
  const prev = allState[userId] || defaultUserBibleState();
  const next = {
    bookmarks: Array.isArray(patch.bookmarks) ? patch.bookmarks : prev.bookmarks,
    progress: patch.progress && typeof patch.progress === "object" ? patch.progress : prev.progress,
    plans: patch.plans && typeof patch.plans === "object" ? patch.plans : prev.plans,
    recents: Array.isArray(patch.recents) ? patch.recents.slice(0, 50) : prev.recents
  };

  allState[userId] = next;
  await saveAllUserState(allState);
  res.status(200).json({ ok: true, userId, item: next });
});

app.post("/api/contact", async (req, res) => {
  const { payload, error } = validatePayload(req.body || {});
  if (error) {
    res.status(400).json({ ok: false, error });
    return;
  }

  const to = process.env.CONTACT_TO || "vinodraj.j@gmail.com";
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const subject = payload.subject || "New message from ziongospelministry.org";

  const text = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    "",
    payload.message
  ].join("\n");

  const html = `
    <h2>New Contact Message</h2>
    <p><strong>Name:</strong> ${payload.name}</p>
    <p><strong>Email:</strong> ${payload.email}</p>
    <p><strong>Message:</strong></p>
    <p>${payload.message.replace(/\n/g, "<br>")}</p>
  `;

  try {
    const transporter = buildTransporter();
    await transporter.sendMail({
      to,
      from,
      replyTo: payload.email,
      subject,
      text,
      html
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Email send failed:", err.message);
    res.status(500).json({ ok: false, error: "Unable to send message." });
  }
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.listen(port, () => {
  console.log(`Contact API running on port ${port}`);
  console.log(`CORS allow-all: ${allowAllOrigins}`);
  console.log(`CORS allowed origins: ${origins.join(", ")}`);
});
