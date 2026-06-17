# Resend + Cloudflare Contact API Runbook

Date: 2026-06-17
Project: Zion Gospel Ministry
Scope: Contact form backend for `contact.html` using Cloudflare Worker + Resend.

## 1. Architecture

Frontend:
- Contact form in `contact.html` posts to `/api/contact`.
- API base URL is selected in `assets/js/site.js` from `data-api-dev` or `data-api-prod`.

Backend:
- Cloudflare Worker script: `api/worker.js`
- Worker config: `api/wrangler.toml`
- Production API hostname: `https://api.ziongospelministry.org`

Email provider:
- Resend HTTP API (no SMTP required in Worker runtime)

## 2. Prerequisites

1. Cloudflare account with access to `ziongospelministry.org` zone.
2. Node.js and npm.
3. Resend account with API key.
4. Domain verification completed in Resend for `ziongospelministry.org`.

## 3. Resend setup

1. Create account at https://resend.com
2. Add and verify domain `ziongospelministry.org`.
3. Complete required DNS records in your DNS provider (Cloudflare DNS).
4. Wait until domain status in Resend is `Verified`.
5. Create API key in Resend dashboard.

Notes:
- `FROM_EMAIL` does not need to be a real mailbox, but it must belong to a verified Resend domain.
- Good production examples: `contact@ziongospelministry.org`, `noreply@ziongospelministry.org`.

## 4. Worker deployment

From `api` folder:

```powershell
cd C:\Users\A717631\repo\ziongospelministry.org\api
npm install --save-dev wrangler
npx wrangler login
npx wrangler deploy
```

Expected:
- Worker created as `zion-contact-api`
- A `workers.dev` URL is provided (example: `https://zion-contact-api.vinodraj-j.workers.dev`)

## 5. Configure Worker secrets

Set these secrets in `api` folder:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_TO
npx wrangler secret put FROM_EMAIL
npx wrangler secret put ALLOWED_ORIGINS
```

Recommended values:
- `CONTACT_TO`: `vinodraj.j@gmail.com`
- `FROM_EMAIL`: `contact@ziongospelministry.org` (or `noreply@ziongospelministry.org`)
- `ALLOWED_ORIGINS`: `https://ziongospelministry.org,https://www.ziongospelministry.org`

Verify secrets exist:

```powershell
npx wrangler secret list
```

Expected names:
- `RESEND_API_KEY`
- `CONTACT_TO`
- `FROM_EMAIL`
- `ALLOWED_ORIGINS`

After changing secrets, redeploy:

```powershell
npx wrangler deploy
```

## 6. Add production subdomain

In Cloudflare dashboard:

1. Workers & Pages → `zion-contact-api`
2. Open `Domains` or `Trigger events` (UI label varies)
3. Add custom domain: `api.ziongospelministry.org`
4. Save and wait until active

Verify:

```powershell
curl.exe -s -i https://api.ziongospelministry.org/api/health
```

Expected: `HTTP/1.1 200 OK` and `{"ok":true}`

## 7. Test API endpoints

### 7.1 Health check

```powershell
curl.exe -s -i https://api.ziongospelministry.org/api/health
```

Expected:
- Status `200`
- Body `{"ok":true}`

### 7.2 CORS preflight

```powershell
curl.exe -s -i -X OPTIONS https://api.ziongospelministry.org/api/contact -H "Origin: https://ziongospelministry.org" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
```

Expected:
- Status `204`
- Header `Access-Control-Allow-Origin: https://ziongospelministry.org`

### 7.3 Contact submit (PowerShell-safe)

```powershell
Invoke-RestMethod `
  -Uri "https://api.ziongospelministry.org/api/contact" `
  -Method Post `
  -Headers @{ Origin = "https://ziongospelministry.org"; "Content-Type" = "application/json" } `
  -Body (@{ name = "Test"; email = "test@example.com"; subject = "Test"; message = "Hello" } | ConvertTo-Json)
```

Expected:
- `{ "ok": true }`

## 8. Website integration check

1. Open production `contact.html`.
2. Submit Message Us form.
3. UI should show: `Thank you. Your message has been sent.`
4. Confirm email arrives in `CONTACT_TO` inbox.

## 9. Troubleshooting

### Symptom: form shows "Unable to send right now"

Check:
1. API returns `500` from `/api/contact`.
2. Missing/incorrect secrets.
3. Resend domain not verified.
4. `FROM_EMAIL` not on verified domain.

Fix steps:
1. Confirm `npx wrangler secret list` contains all required secrets.
2. Re-enter secrets and redeploy.
3. Ensure `FROM_EMAIL` matches verified domain exactly.

### Symptom: CORS error in browser

Check:
1. `ALLOWED_ORIGINS` contains both `https://ziongospelministry.org` and `https://www.ziongospelministry.org`.
2. Preflight OPTIONS returns 204 with allow-origin header.

### Symptom: worker exists but custom domain not reachable

Check:
1. Custom domain was added under Worker Domains/Trigger events.
2. Domain status is active.
3. Health endpoint on custom domain responds 200.

### Symptom: no diagnostics in dashboard

- Enable Worker logs (Workers Logs) in Cloudflare so runtime errors are visible.

## 10. Operational commands quick reference

```powershell
# Deploy
npx wrangler deploy

# List secrets
npx wrangler secret list

# Set one secret
npx wrangler secret put FROM_EMAIL

# Check account
npx wrangler whoami
```

## 11. Security notes

1. Never commit API keys or secret values to git.
2. Keep all credentials only in Cloudflare secrets.
3. Rotate `RESEND_API_KEY` periodically.
4. Restrict allowed origins to production domains and trusted dev origins only.
