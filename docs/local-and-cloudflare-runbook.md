# Local Run and Cloudflare Setup Runbook

Date: 2026-06-17
Project: Zion Gospel Ministry

## Goal

This guide explains:
1. How to run the site and API locally.
2. What to configure for Cloudflare during migration.
3. What to configure for a full API move from Render to Cloudflare.

## Current architecture snapshot

Static website:
- HTML/CSS/JS served as static files.

Backend API:
- Express API in [api/server.js](../api/server.js).
- Contact form endpoint: POST /api/contact.
- Contact page form wiring in [contact.html](../contact.html).
- Frontend endpoint resolver in [assets/js/site.js](../assets/js/site.js).

Current production form API base in source code:
- data-api-prod points to https://api.ziongospelministry.org.

## Prerequisites

1. Node.js 18+ (recommended).
2. npm.
3. SMTP account credentials for sending contact emails.
4. PowerShell terminal on Windows.

## Run locally

### 1. Install API dependencies

From repository root:

```powershell
Set-Location api
npm install
```

### 2. Configure local environment

Create api/.env from [api/.env.example](../api/.env.example) and set real values:

Required variables:
- PORT
- ALLOWED_ORIGINS
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- CONTACT_TO
- FROM_EMAIL

Recommended local ALLOWED_ORIGINS:
- http://127.0.0.1:4177
- http://localhost:4177

Example:

```env
PORT=8787
ALLOWED_ORIGINS=http://127.0.0.1:4177,http://localhost:4177
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-app-password
CONTACT_TO=your-inbox@example.com
FROM_EMAIL=no-reply@ziongospelministry.org
```

### 3. Start API

```powershell
Set-Location api
npm start
```

Expected startup logs include:
- Contact API running on port 8787
- CORS allowed origins list

### 4. Serve static site locally

From repository root, serve static files on port 4177 (any static server is fine):

```powershell
npx http-server . -p 4177 -c-1
```

If you do not want to install tools globally, this one-liner works with npx.

### 5. Verify local pages

Open:
- http://127.0.0.1:4177/index.html
- http://127.0.0.1:4177/contact.html

Expected:
1. index page loads and dynamic sections populate from local JSON files.
2. contact page form posts to local API because data-api-dev is set.

### 6. Verify API quickly from terminal

Health:

```powershell
curl.exe -i http://127.0.0.1:8787/api/health
```

Contact validation test:

```powershell
curl.exe -i -X POST http://127.0.0.1:8787/api/contact -H "Origin: http://127.0.0.1:4177" -H "Content-Type: application/json" --data-raw '{"name":"","email":"bad","message":""}'
```

Expected result: 400 with validation error JSON.

## Cloudflare setup

## Full move: API endpoint on Cloudflare

Use this when your contact API host is a Cloudflare-managed domain.

1. Choose API runtime target:
   - Cloudflare Worker or Pages Functions
   - Or another Cloudflare-backed service behind your domain
2. Set production API URL in [contact.html](../contact.html):
   - Use data-api-prod as your Cloudflare API host (configured as https://api.ziongospelministry.org)
3. Keep action as /api/contact so resolver composes final endpoint correctly.
4. Set equivalent secrets in Cloudflare for SMTP and routing values.

Important runtime note:
- The current Express + Nodemailer service expects SMTP connectivity.
- Standard Cloudflare Worker runtime does not provide direct TCP sockets for Nodemailer SMTP in the same way as Node.js servers.
- If you move fully to Worker runtime, plan either:
  1. HTTP-based email provider API integration, or
  2. A compatible backend runtime that supports SMTP transport.

## Cloudflare variables and secrets checklist

For whichever backend runtime you use in Cloudflare, provide equivalents of:
- ALLOWED_ORIGINS
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- CONTACT_TO
- FROM_EMAIL

Also ensure:
- CORS includes both apex and www site origins.
- TLS certificates are active for site and API domains.
- DNS records point to the intended Cloudflare targets.

## Before commit checklist for full cutover

Use this list before creating your commit:

1. Code and routing
   - Confirm [contact.html](../contact.html) has data-api-prod="https://api.ziongospelministry.org".
   - Confirm [assets/js/site.js](../assets/js/site.js) still resolves action "/api/contact" against data-api-prod.
   - Confirm [api/server.js](../api/server.js) defaultAllowedOrigins no longer references Render.
2. Cloudflare DNS
   - Create DNS record for api.ziongospelministry.org to your Cloudflare API runtime target.
   - Verify TLS is active and hostname resolves publicly.
3. Cloudflare runtime configuration
   - Set secrets/variables: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, CONTACT_TO, FROM_EMAIL, ALLOWED_ORIGINS.
   - Set ALLOWED_ORIGINS to include https://ziongospelministry.org and https://www.ziongospelministry.org.
4. Pre-commit local verification
   - Run API locally and confirm GET /api/health returns 200.
   - Run invalid contact POST and confirm 400 validation JSON.
   - Run one valid contact POST with test inbox and confirm delivery.
5. Staged production verification
   - Deploy API first and test https://api.ziongospelministry.org/api/health.
   - Open production contact page and submit a test message.
   - Check browser network tab: OPTIONS 204 and POST 200 for /api/contact.
6. Safety and rollback
   - Keep previous Render endpoint noted in your deployment ticket for emergency rollback.
   - Tag this migration commit clearly (example: chore(api): cut over contact api host to cloudflare).

## Post-migration validation checklist

1. Open home page and confirm content loads:
   - [index.html](../index.html)
2. Open contact page and submit a test message:
   - [contact.html](../contact.html)
3. Verify preflight and POST response from browser network tab.
4. Confirm API /api/health is 200 from production endpoint.
5. Confirm message arrives in CONTACT_TO inbox.

## Troubleshooting

Contact form shows unable to send right now:
1. Check API logs for missing SMTP configuration.
2. Verify SMTP credentials and app password.
3. Confirm ALLOWED_ORIGINS includes the page origin.
4. Confirm data-api-prod points to the active API host.

CORS failure in browser:
1. Inspect Origin request header.
2. Add exact origin to ALLOWED_ORIGINS.
3. Redeploy backend and retry.

Validation errors:
1. Name, email, and message are required.
2. Email must match a valid format.
3. Message length must be 8000 chars or less.

## Related docs

- [docs/migration-verification-index-contact.md](migration-verification-index-contact.md)
- [README.md](../README.md)
- [api/.env.example](../api/.env.example)
