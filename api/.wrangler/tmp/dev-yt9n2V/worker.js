var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var DEFAULT_ALLOWED_ORIGINS = [
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
__name(getAllowedOrigins, "getAllowedOrigins");
function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (_) {
    return "";
  }
}
__name(normalizeOrigin, "normalizeOrigin");
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
__name(buildCorsHeaders, "buildCorsHeaders");
function corsPreflightResponse(request, env) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, env)
  });
}
__name(corsPreflightResponse, "corsPreflightResponse");
function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");
function csvResponse(content, fileName, corsHeaders) {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      ...corsHeaders
    }
  });
}
__name(csvResponse, "csvResponse");
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
  if (message.length > 8e3) {
    return { error: "Message is too long." };
  }
  return { payload: { name, email, subject, message } };
}
__name(validatePayload, "validatePayload");
function validateSmallGroupPayload(body) {
  const name = String(body.name || "").trim();
  const area = String(body.area || "").trim();
  const phone = String(body.phone || "").trim();
  const message = String(body.message || "").trim();
  if (!name) return { error: "Name is required." };
  if (name.length > 120) return { error: "Name is too long." };
  if (area.length > 120) return { error: "Preferred area is too long." };
  if (phone.length > 50) return { error: "Phone is too long." };
  if (message.length > 3e3) return { error: "Comments are too long." };
  return { payload: { name, area, phone, message } };
}
__name(validateSmallGroupPayload, "validateSmallGroupPayload");
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
  if (message.length > 3e3) return { error: "Notes are too long." };
  return { payload: { name, email, ministry, message } };
}
__name(validateVolunteerPayload, "validateVolunteerPayload");
function requireDb(env) {
  if (!env.DB) {
    throw new Error("D1 binding DB is not configured.");
  }
  return env.DB;
}
__name(requireDb, "requireDb");
async function saveSmallGroupRegistration(env, payload) {
  const db = requireDb(env);
  await db.prepare(
    `INSERT INTO small_group_registrations (name, area, phone, message)
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(payload.name, payload.area, payload.phone, payload.message).run();
}
__name(saveSmallGroupRegistration, "saveSmallGroupRegistration");
async function saveVolunteerSignup(env, payload) {
  const db = requireDb(env);
  await db.prepare(
    `INSERT INTO volunteer_signups (name, email, ministry, message)
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(payload.name, payload.email, payload.ministry, payload.message).run();
}
__name(saveVolunteerSignup, "saveVolunteerSignup");
function csvEscape(value) {
  const raw = String(value == null ? "" : value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}
__name(csvEscape, "csvEscape");
function makeCsv(header, rows) {
  const lines = [header.map(csvEscape).join(",")];
  rows.forEach((row) => {
    lines.push(row.map(csvEscape).join(","));
  });
  return lines.join("\n");
}
__name(makeCsv, "makeCsv");
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
__name(exportRowsAsCsv, "exportRowsAsCsv");
function isExportAuthorized(request, env, url) {
  const expected = String(env.EXPORT_TOKEN || "").trim();
  if (!expected) return false;
  const headerToken = String(request.headers.get("x-admin-token") || "").trim();
  const queryToken = String(url.searchParams.get("token") || "").trim();
  return headerToken === expected || queryToken === expected;
}
__name(isExportAuthorized, "isExportAuthorized");
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
    <p style="white-space:pre-wrap">${payload.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    <hr>
    <p style="color:#888;font-size:12px">Sent via ziongospelministry.org contact form</p>
  `;
  const text = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.subject ? `Subject: ${payload.subject}` : "",
    "",
    payload.message
  ].filter((l) => l !== void 0).join("\n");
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
__name(sendEmailViaResend, "sendEmailViaResend");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    const corsHeaders = buildCorsHeaders(request, env);
    if (method === "OPTIONS") {
      return corsPreflightResponse(request, env);
    }
    if (method === "GET" && path === "/api/health") {
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }
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

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-GH7pai/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-GH7pai/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
