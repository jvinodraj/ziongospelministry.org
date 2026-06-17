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

function csvResponse(content, fileName, corsHeaders) {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
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

function validateSmallGroupPayload(body) {
  const name = String(body.name || "").trim();
  const area = String(body.area || "").trim();
  const phone = String(body.phone || "").trim();
  const message = String(body.message || "").trim();

  if (!name) return { error: "Name is required." };
  if (name.length > 120) return { error: "Name is too long." };
  if (area.length > 120) return { error: "Preferred area is too long." };
  if (phone.length > 50) return { error: "Phone is too long." };
  if (message.length > 3000) return { error: "Comments are too long." };

  return { payload: { name, area, phone, message } };
}

function validateVolunteerPayload(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const ministry = String(body.ministry || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !email) {
    return { error: "Name and email are required." };
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Invalid email address." };
  }

  if (name.length > 120) return { error: "Name is too long." };
  if (ministry.length > 120) return { error: "Ministry interest is too long." };
  if (message.length > 3000) return { error: "Notes are too long." };

  return { payload: { name, email, ministry, message } };
}

function requireDb(env) {
  if (!env.DB) {
    throw new Error("D1 binding DB is not configured.");
  }
  return env.DB;
}

async function saveSmallGroupRegistration(env, payload) {
  const db = requireDb(env);
  await db.prepare(
    `INSERT INTO small_group_registrations (name, area, phone, message)
     VALUES (?1, ?2, ?3, ?4)`
  )
    .bind(payload.name, payload.area, payload.phone, payload.message)
    .run();
}

async function saveVolunteerSignup(env, payload) {
  const db = requireDb(env);
  await db.prepare(
    `INSERT INTO volunteer_signups (name, email, ministry, message)
     VALUES (?1, ?2, ?3, ?4)`
  )
    .bind(payload.name, payload.email, payload.ministry, payload.message)
    .run();
}

function csvEscape(value) {
  const raw = String(value == null ? "" : value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function makeCsv(header, rows) {
  const lines = [header.map(csvEscape).join(",")];
  rows.forEach((row) => {
    lines.push(row.map(csvEscape).join(","));
  });
  return lines.join("\n");
}

async function exportRowsAsCsv(env, type) {
  const db = requireDb(env);

  if (type === "small_group") {
    const result = await db.prepare(
      `SELECT id, created_at, name, area, phone, message
       FROM small_group_registrations
       ORDER BY created_at DESC`
    ).all();

    const rows = (result.results || []).map((r) => [
      r.id,
      r.created_at,
      r.name,
      r.area,
      r.phone,
      r.message
    ]);

    return {
      fileName: "small-group-registrations.csv",
      content: makeCsv(["id", "created_at", "name", "area", "phone", "message"], rows)
    };
  }

  if (type === "volunteer") {
    const result = await db.prepare(
      `SELECT id, created_at, name, email, ministry, message
       FROM volunteer_signups
       ORDER BY created_at DESC`
    ).all();

    const rows = (result.results || []).map((r) => [
      r.id,
      r.created_at,
      r.name,
      r.email,
      r.ministry,
      r.message
    ]);

    return {
      fileName: "volunteer-signups.csv",
      content: makeCsv(["id", "created_at", "name", "email", "ministry", "message"], rows)
    };
  }

  throw new Error("Unsupported export type.");
}

function isExportAuthorized(request, env, url) {
  const expected = String(env.EXPORT_TOKEN || "").trim();
  if (!expected) return false;

  const headerToken = String(request.headers.get("x-admin-token") || "").trim();
  const queryToken = String(url.searchParams.get("token") || "").trim();
  return headerToken === expected || queryToken === expected;
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

    // GET /api/export?type=small_group|volunteer&format=csv
    if (method === "GET" && path === "/api/export") {
      if (!isExportAuthorized(request, env, url)) {
        return jsonResponse({ ok: false, error: "Unauthorized." }, 401, corsHeaders);
      }

      const type = String(url.searchParams.get("type") || "").trim();
      const format = String(url.searchParams.get("format") || "csv").trim().toLowerCase();

      if (format !== "csv") {
        return jsonResponse({ ok: false, error: "Only csv format is supported." }, 400, corsHeaders);
      }

      if (type !== "small_group" && type !== "volunteer") {
        return jsonResponse({ ok: false, error: "Invalid export type." }, 400, corsHeaders);
      }

      try {
        const exported = await exportRowsAsCsv(env, type);
        return csvResponse(exported.content, exported.fileName, corsHeaders);
      } catch (err) {
        console.error("CSV export failed:", err.message);
        return jsonResponse({ ok: false, error: "Unable to export data." }, 500, corsHeaders);
      }
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

    // POST /api/small-group
    if (method === "POST" && path === "/api/small-group") {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400, corsHeaders);
      }

      const { payload, error } = validateSmallGroupPayload(body);
      if (error) {
        return jsonResponse({ ok: false, error }, 400, corsHeaders);
      }

      try {
        await saveSmallGroupRegistration(env, payload);
        return jsonResponse({ ok: true }, 200, corsHeaders);
      } catch (err) {
        console.error("Small group save failed:", err.message);
        return jsonResponse({ ok: false, error: "Unable to save registration." }, 500, corsHeaders);
      }
    }

    // POST /api/volunteer
    if (method === "POST" && path === "/api/volunteer") {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400, corsHeaders);
      }

      const { payload, error } = validateVolunteerPayload(body);
      if (error) {
        return jsonResponse({ ok: false, error }, 400, corsHeaders);
      }

      try {
        await saveVolunteerSignup(env, payload);
        return jsonResponse({ ok: true }, 200, corsHeaders);
      } catch (err) {
        console.error("Volunteer save failed:", err.message);
        return jsonResponse({ ok: false, error: "Unable to save signup." }, 500, corsHeaders);
      }
    }

    return jsonResponse({ ok: false, error: "Not found." }, 404, corsHeaders);
  }
};
