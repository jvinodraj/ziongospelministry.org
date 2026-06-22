#!/usr/bin/env node
/*
 * Import translation verse text into bible-data/<version>/<Book>.json
 *
 * Supported source modes:
 * 1) Per-book folder:
 *    node tools/import-translation-data.js --version niv --input data-import/niv
 *
 *    Expects one file per book (e.g. Genesis.json) in any of these shapes:
 *    - {"chapters":[{"chapter":1,"verses":[{"verse":1,"text":"..."}]}]}
 *    - {"Genesis":{"1":{"1":"..."}}}
 *    - {"1":{"1":"..."}}
 *
 * 2) Single merged file:
 *    node tools/import-translation-data.js --version niv --source data-import/niv.json
 *
 *    Expects top-level keyed by book name and/or chapter maps.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BOOKS_META_PATH = path.join(ROOT, "assets", "data", "bible-books.json");
const DATA_ROOT = path.join(ROOT, "bible-data");

function fail(msg) {
  console.error("ERROR:", msg);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeVerseArray(versesRaw) {
  if (!versesRaw) return [];

  if (Array.isArray(versesRaw)) {
    if (!versesRaw.length) return [];

    if (typeof versesRaw[0] === "string") {
      return versesRaw.map((text, idx) => ({ verse: idx + 1, text: String(text || "") }));
    }

    if (typeof versesRaw[0] === "object") {
      return versesRaw
        .map((v, idx) => {
          const verseNum = toNum(v.verse) || idx + 1;
          const text = String(v.text || "").trim();
          return text ? { verse: verseNum, text } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.verse - b.verse);
    }
  }

  if (typeof versesRaw === "object") {
    return Object.keys(versesRaw)
      .map((k) => {
        const verse = toNum(k);
        const text = String(versesRaw[k] || "").trim();
        if (!verse || !text) return null;
        return { verse, text };
      })
      .filter(Boolean)
      .sort((a, b) => a.verse - b.verse);
  }

  return [];
}

function chapterMapFromRaw(raw, bookName) {
  if (!raw || typeof raw !== "object") return {};

  // Shape: { chapters: [{ chapter, verses }] }
  if (Array.isArray(raw.chapters)) {
    const out = {};
    raw.chapters.forEach((chObj, idx) => {
      const chNum = toNum(chObj.chapter) || idx + 1;
      out[chNum] = normalizeVerseArray(chObj.verses);
    });
    return out;
  }

  // Shape: { BookName: { "1": { "1": "text" } } }
  if (raw[bookName] && typeof raw[bookName] === "object") {
    return chapterMapFromRaw(raw[bookName], bookName);
  }

  // Shape: { "1": {"1":"text"}, "2": {...} }
  const numericKeys = Object.keys(raw).filter((k) => /^\d+$/.test(k));
  if (numericKeys.length) {
    const out = {};
    numericKeys.forEach((k) => {
      out[toNum(k)] = normalizeVerseArray(raw[k]);
    });
    return out;
  }

  // Shape: { chapters: { "1": {...} } }
  if (raw.chapters && typeof raw.chapters === "object") {
    return chapterMapFromRaw(raw.chapters, bookName);
  }

  return {};
}

function parseArgs(argv) {
  const args = {
    version: "",
    input: "",
    source: "",
    dryRun: false
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--version" || a === "-v") args.version = String(argv[++i] || "").toLowerCase();
    else if (a === "--input" || a === "-i") args.input = String(argv[++i] || "");
    else if (a === "--source" || a === "-s") args.source = String(argv[++i] || "");
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }

  return args;
}

function printHelp() {
  console.log([
    "Usage:",
    "  node tools/import-translation-data.js --version <nkjv|niv|esv|pv|kjv> [--input <dir>] [--source <jsonFile>] [--dry-run]",
    "",
    "Examples:",
    "  node tools/import-translation-data.js --version niv --input data-import/niv",
    "  node tools/import-translation-data.js --version nkjv --source data-import/nkjv.json",
    "  node tools/import-translation-data.js --version esv --input data-import/esv --dry-run"
  ].join("\n"));
}

function resolveBookFileCandidates(baseDir, bookMeta) {
  const candidates = [
    bookMeta.file,
    bookMeta.name + ".json",
    bookMeta.name.replace(/\s+/g, "") + ".json",
    bookMeta.slug + ".json"
  ];

  return candidates
    .map((f) => path.join(baseDir, f))
    .filter((p, idx, arr) => arr.indexOf(p) === idx);
}

function mergedBookData(merged, bookMeta) {
  if (!merged || typeof merged !== "object") return null;

  return (
    merged[bookMeta.name] ||
    merged[bookMeta.slug] ||
    merged[bookMeta.file.replace(/\.json$/i, "")] ||
    null
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.version) fail("Missing --version");

  const books = readJson(BOOKS_META_PATH);
  if (!Array.isArray(books) || books.length !== 66) {
    fail("assets/data/bible-books.json is missing or invalid");
  }

  const targetDir = path.join(DATA_ROOT, args.version);
  if (!fs.existsSync(targetDir)) {
    fail("Target translation folder not found: " + targetDir);
  }

  const inputDir = args.input ? path.resolve(ROOT, args.input) : "";
  const sourcePath = args.source ? path.resolve(ROOT, args.source) : "";

  if (!inputDir && !sourcePath) {
    fail("Provide --input <dir> or --source <jsonFile>");
  }

  let merged = null;
  if (sourcePath) {
    if (!fs.existsSync(sourcePath)) fail("Merged source file not found: " + sourcePath);
    merged = readJson(sourcePath);
  }

  if (inputDir && !fs.existsSync(inputDir)) {
    fail("Input folder not found: " + inputDir);
  }

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  let totalVerses = 0;

  for (const bookMeta of books) {
    let raw = null;

    if (inputDir) {
      const candidates = resolveBookFileCandidates(inputDir, bookMeta);
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          raw = readJson(candidate);
          break;
        }
      }
    }

    if (!raw && merged) {
      raw = mergedBookData(merged, bookMeta);
    }

    if (!raw) {
      missing++;
      continue;
    }

    const chapterMap = chapterMapFromRaw(raw, bookMeta.name);
    const chapters = [];
    let bookVerseCount = 0;

    for (let ch = 1; ch <= bookMeta.chapters; ch++) {
      const verses = normalizeVerseArray(chapterMap[ch] || []);
      bookVerseCount += verses.length;
      chapters.push({ chapter: ch, verses });
    }

    if (bookVerseCount === 0) {
      skipped++;
      continue;
    }

    totalVerses += bookVerseCount;
    const out = {
      book: bookMeta.name,
      translation: args.version,
      status: "complete",
      note: "Imported via tools/import-translation-data.js",
      chapters
    };

    if (!args.dryRun) {
      const targetFile = path.join(targetDir, bookMeta.file);
      writeJson(targetFile, out);
    }

    updated++;
  }

  console.log("Import summary");
  console.log("- version:      ", args.version);
  console.log("- updated books:", updated);
  console.log("- skipped books:", skipped);
  console.log("- missing books:", missing);
  console.log("- total verses: ", totalVerses);
  console.log("- mode:         ", args.dryRun ? "dry-run" : "write");
}

main();
