/**
 * Cloudflare Worker — Zion Gospel Ministry contact API
 *
 * Routes:
 *   GET  /api/health      → health probe
 *   POST /api/contact     → send contact email via Resend HTTP API
 *
 * Required Worker secrets (set via Cloudflare dashboard or wrangler secret put):
 *   RESEND_API_KEY   — API key from resend.com (free tier: 3000 emails/month)
 *   CONTACT_TO       — recipient address, e.g. vinodraj.j@gmail.com
 *   FROM_EMAIL       — verified sender address on Resend, e.g. no-reply@ziongospelministry.org
 *   ALLOWED_ORIGINS  — comma-separated allowed CORS origins
 *                      e.g. https://ziongospelministry.org,https://www.ziongospelministry.org
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://ziongospelministry.org",
  "https://www.ziongospelministry.org",
  "http://127.0.0.1:4177",
  "http://localhost:4177"
];

function getAllowedOrigins(env) {
  const raw = String(env.ALLOWED_ORIGINS || "").trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (_) {
    return "";
  }
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = getAllowedOrigins(env);
  const normalized = new Set(allowed.map(normalizeOrigin).filter(Boolean));
  const reqOrigin = normalizeOrigin(origin);
  const allowOrigin = normalized.has(reqOrigin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function corsPreflightResponse(request, env) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, env)
  });
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

function validatePayload(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !email || !message) {
    return { error: "Name, email, and message are required." };
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Invalid email address." };
  }

  if (message.length > 8000) {
    return { error: "Message is too long." };
  }

  return { payload: { name, email, subject, message } };
}

async function sendEmailViaResend(env, payload) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const to = env.CONTACT_TO || "vinodraj.j@gmail.com";
  const from = env.FROM_EMAIL || "no-reply@ziongospelministry.org";
  const subject = payload.subject || "New message from ziongospelministry.org";

  const html = `
    <h2 style="color:#1f4b6d">New Contact Message</h2>
    <p><strong>Name:</strong> ${payload.name}</p>
    <p><strong>Email:</strong> <a href="mailto:${payload.email}">${payload.email}</a></p>
    ${payload.subject ? `<p><strong>Subject:</strong> ${payload.subject}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p style="white-space:pre-wrap">${payload.message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>
    <hr>
    <p style="color:#888;font-size:12px">Sent via ziongospelministry.org contact form</p>
  `;

  const text = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.subject ? `Subject: ${payload.subject}` : "",
    "",
    payload.message
  ].filter((l) => l !== undefined).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject,
      html,
      text
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  return await res.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    const corsHeaders = buildCorsHeaders(request, env);

    // CORS preflight
    if (method === "OPTIONS") {
      return corsPreflightResponse(request, env);
    }

    // GET /api/health
    if (method === "GET" && path === "/api/health") {
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }

    // POST /api/contact
    if (method === "POST" && path === "/api/contact") {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400, corsHeaders);
      }

      const { payload, error } = validatePayload(body);
      if (error) {
        return jsonResponse({ ok: false, error }, 400, corsHeaders);
      }

      try {
        await sendEmailViaResend(env, payload);
        return jsonResponse({ ok: true }, 200, corsHeaders);
      } catch (err) {
        console.error("Email send failed:", err.message);
        return jsonResponse({ ok: false, error: "Unable to send message." }, 500, corsHeaders);
      }
    }

    return jsonResponse({ ok: false, error: "Not found." }, 404, corsHeaders);
  }
};
