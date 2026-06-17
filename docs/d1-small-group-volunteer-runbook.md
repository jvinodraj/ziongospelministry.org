# Cloudflare D1 Runbook (Small Group + Volunteer)

Date: 2026-06-17
Project: Zion Gospel Ministry

## 1. What this adds

- Persists small-group registrations in D1.
- Persists volunteer signups in D1.
- Keeps existing contact email endpoint unchanged.
- Adds CSV export endpoint for Excel/Google Drive backup.

API routes:
- POST /api/small-group
- POST /api/volunteer
- GET /api/export?type=small_group&format=csv
- GET /api/export?type=volunteer&format=csv

## 2. Prerequisites

1. Cloudflare account with Workers and D1 enabled.
2. Wrangler CLI installed in api folder dependencies.
3. Already logged in with `npx wrangler login`.

## 3. Create D1 database

From api folder:

```powershell
Set-Location C:\Users\A717631\repo\ziongospelministry.org\api
npx wrangler d1 create zion_ministry_db
```

Copy the returned `database_id`.

## 4. Bind D1 to Worker

Uncomment and fill the D1 block in api/wrangler.toml:

```toml
[[d1_databases]]
binding = "DB"
database_name = "zion_ministry_db"
database_id = "<your-database-id>"
```

## 5. Apply schema

```powershell
npx wrangler d1 execute zion_ministry_db --remote --file=./schema/forms_d1.sql
```

## 6. Configure secrets

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_TO
npx wrangler secret put FROM_EMAIL
npx wrangler secret put EXPORT_TOKEN
```

Notes:
- `EXPORT_TOKEN` protects CSV downloads.
- Use a long random value for `EXPORT_TOKEN`.

## 7. Deploy Worker

```powershell
npx wrangler deploy
```

## 8. Test form submissions

Small group test:

```powershell
$body = @{ name='Test User'; area='Chennai'; phone='12345'; message='Interested' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://api.ziongospelministry.org/api/small-group" -ContentType "application/json" -Body $body
```

Volunteer test:

```powershell
$body = @{ name='Volunteer User'; email='volunteer@example.com'; ministry='Youth'; message='Can serve weekends' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://api.ziongospelministry.org/api/volunteer" -ContentType "application/json" -Body $body
```

## 9. Export CSV for Excel/Drive

Using query token:

```powershell
$token = "<EXPORT_TOKEN>"
Invoke-WebRequest -Uri "https://api.ziongospelministry.org/api/export?type=small_group&format=csv&token=$token" -OutFile "small-group.csv"
Invoke-WebRequest -Uri "https://api.ziongospelministry.org/api/export?type=volunteer&format=csv&token=$token" -OutFile "volunteer.csv"
```

Recommended:
- Download monthly and upload to Google Drive.
- Keep only needed personal data and review retention periodically.
