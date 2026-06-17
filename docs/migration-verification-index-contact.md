# Migration Verification: Index and Contact

Date: 2026-06-17
Scope: Server-side code inventory and runtime verification for incremental migration from Render to Cloudflare.

## 1. Server-side code inventory

Primary backend service:
- [api/server.js](../api/server.js)

Backend package/runtime:
- [api/package.json](../api/package.json)

Schema artifact (not currently wired into runtime path):
- [api/schema/bible_reader_schema.sql](../api/schema/bible_reader_schema.sql)

Frontend form wiring and endpoint resolver:
- [contact.html](../contact.html#L74)
- [assets/js/site.js](../assets/js/site.js#L88)

## 2. API routes discovered

From [api/server.js](../api/server.js):

- GET /api/health ([line 216](../api/server.js#L216))
- GET /api/bible/books ([line 220](../api/server.js#L220))
- GET /api/bible/search ([line 225](../api/server.js#L225))
- GET /api/bible/audio/:bookSlug/:chapter ([line 268](../api/server.js#L268))
- GET /api/bible/:bookSlug ([line 288](../api/server.js#L288))
- GET /api/bible/:bookSlug/:chapter ([line 300](../api/server.js#L300))
- GET /api/bible/:bookSlug/:chapter/:verse ([line 330](../api/server.js#L330))
- GET /api/user/:userId/bible/state ([line 359](../api/server.js#L359))
- PATCH /api/user/:userId/bible/state ([line 365](../api/server.js#L365))
- POST /api/contact ([line 383](../api/server.js#L383))

CORS allowlist defaults declared at [api/server.js line 10](../api/server.js#L10).

## 3. Verification performed

### 3.1 Static and smoke checks

- HTML validation passed via tools script.
- Smoke check passed for:
  - https://ziongospelministry.org/
  - https://ziongospelministry.org/index.html
  - https://ziongospelministry.org/contact.html

Related scripts:
- [tools/validate_site.py](../tools/validate_site.py)
- [tools/smoke_check.py](../tools/smoke_check.py)

### 3.2 Index page status

Result: Working.

Evidence:
- Local index served with HTTP 200.
- Expected dynamic placeholders found (weekly verse and home events containers).

Source page:
- [index.html](../index.html)

### 3.3 Contact page and API status

Workspace implementation result: Wired correctly.

Evidence:
- Contact form includes API submit attributes in [contact.html line 74](../contact.html#L74):
  - data-email-submit
  - data-api-dev="http://127.0.0.1:8787"
  - data-api-prod="https://ziongospelministry-org.onrender.com"
  - action="/api/contact"
- API endpoint resolution implemented in [assets/js/site.js line 88](../assets/js/site.js#L88).

Local API runtime result:
- OPTIONS /api/contact from origin http://127.0.0.1:4177 returned 204 with Access-Control-Allow-Origin.
- Invalid POST payload returned expected 400 JSON validation error.
- Valid POST payload returned 500 because SMTP configuration was not set locally.

Live Render API result:
- https://ziongospelministry-org.onrender.com/api/health returned 200.
- OPTIONS /api/contact with origin https://ziongospelministry.org returned 204 and correct CORS headers.
- Invalid POST /api/contact returned expected 400 JSON validation error.

## 4. Important deployment discrepancy

Current production contact page content does not match workspace [contact.html](../contact.html).

Observed behavior:
- Live https://ziongospelministry.org/contact.html returns an Under Construction page.
- This means the production user-facing contact form flow is currently not active, even though the Render API endpoint is healthy.

## 5. Incremental migration readiness (index then contact)

Status summary:
- Index: Ready.
- Contact backend endpoint behavior: Ready for migration validation.
- Contact end-to-end user flow: Not currently active in production page content.

Recommended next actions:
1. Deploy repository contact page to production environment so form UI is active.
2. Keep current Render endpoint during cutover, then switch data-api-prod to Cloudflare API host.
3. Update CORS allowlist in backend to include final Cloudflare site origin(s).
4. Configure SMTP secrets in Cloudflare runtime before enabling live submissions.
5. Re-run smoke plus API preflight/post checks after each incremental step.
