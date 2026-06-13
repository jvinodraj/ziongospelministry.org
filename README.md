# Zion Gospel Ministry Website

Modern, responsive, Christ-centered digital ministry website for Zion Gospel Ministry.

## Features

- Full multi-page navigation:
	- Home
	- About Us
	- Sermons
	- Bible Studies
	- Ministries
	- Events
	- Missions
	- Prayer
	- Resources
	- Contact
- Light and dark mode support.
- Mobile-first responsive layout.
- Data-driven sections using JSON files.
- Search and filtering for sermons and Bible studies.
- Prayer request and testimony forms (static demo handlers).
- Scripture memory tracker (local storage based).
- PWA support (manifest + service worker).

## Structure

- `assets/css/style.css`: Shared design system.
- `assets/js/site.js`: Shared page logic, dynamic rendering, interactions.
- `assets/js/bible.js`: Bible reading/search/text-to-speech functionality.
- `assets/data/*.json`: Content for sermons, events, studies, devotions, verses, missions, prayer wall.
- `manifest.webmanifest`: PWA metadata.
- `sw.js`: Service worker cache strategy.

## Deployment

This project is fully static and can be deployed on:

- GitHub Pages
- Netlify
- Vercel static hosting
- Any static web server

## Staged Dev -> Prod Release

This repo now includes a staged GitHub Actions pipeline at `.github/workflows/staged-release.yml`.

Release order:

1. Validate HTML structure and local asset references.
2. Package one static artifact.
3. Deploy to `dev` environment.
4. Run smoke checks in `dev`.
5. Deploy the same artifact to `prod`.
6. Run smoke checks in `prod`.

### Required GitHub setup

Create two GitHub Environments in your repository:

- `dev`
- `prod`

Set these values in each environment:

- Variable: `DEPLOY_REGION`
- Variable: `BASE_URL`
- Secret: `DEPLOY_WEBHOOK_URL` (optional; if missing, deployment runs in dry-run mode)

Recommended protection:

- Add required reviewers for `prod` to force manual approval after dev passes.

### Region config templates

Use these templates to keep env/region intent explicit:

- `deploy/config/dev.json`
- `deploy/config/prod.json`

### Incremental page release (Home first)

Use the page allowlist manifest:

- `deploy/pages-manifest.json`

How it works:

1. `dev` can include all pages (for full internal testing).
2. `prod` starts with only `index.html`.
3. When a page is approved, add it to `prod` and push again.

Example rollout:

1. Start: `"prod": ["index.html"]`
2. Add About page: `"prod": ["index.html", "about.html"]`
3. Add Sermons page: `"prod": ["index.html", "about.html", "sermons.html"]`

The deploy pipeline will package only the approved files for each environment.

### Manual run option

You can run the workflow manually and decide whether to continue to production using the `deploy_prod` input.

## Notes

- Form submissions are currently local/static stubs. Connect real form endpoints (Formspree, Getform, custom backend) before production.
- Member portal is currently a prototype UI and requires secure backend authentication for production use.

## Contact Form API (Backend)

The Message Us form is now wired to a backend endpoint: `/api/contact`.

### Files

- `api/server.js`: Express + Nodemailer API.
- `api/.env.example`: Required environment variables.
- `api/package.json`: API dependencies and scripts.

### Local Run

1. Install API dependencies:
	- `cd api`
	- `npm install`
2. Create `.env` from `.env.example` and fill SMTP credentials.
3. Start API:
	- `npm start`
4. Serve website and API behind the same host/reverse proxy, or use an absolute API URL in the form `action`.

### Production Notes

- GitHub Pages cannot run server-side code directly.
- Deploy the `api` folder to a backend host (Render, Railway, Fly.io, Azure, etc.).
- If backend is on another domain, update CORS `ALLOWED_ORIGINS` in API config.
- Point form `action` to your deployed API URL (for example: `https://your-api-domain.com/api/contact`).

### Environment-based API Routing

The contact form supports separate API base URLs by environment:

- `data-api-dev`: used on `localhost` or `127.0.0.1`
- `data-api-prod`: used on all other hosts

Current form configuration in `contact.html`:

- `data-api-dev="http://127.0.0.1:8787"`
- `data-api-prod="https://api.ziongospelministry.org"`
- `action="/api/contact"`

This means the same HTML works in both environments without manual form action edits.