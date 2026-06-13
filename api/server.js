const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 8787);
const defaultAllowedOrigins = [
  "https://ziongospelministry.org",
  "http://127.0.0.1:4177",
  "http://localhost:4177"
];

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const origins = allowedOrigins.length ? allowedOrigins : defaultAllowedOrigins;

app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed"));
  }
}));

app.use(express.json({ limit: "100kb" }));

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
});
