# Bible Reader Architecture

## Page and Components

- Route/Page: `/bible` (served by `bible.html`)
- Core script: `assets/js/bible-reader.js`
- Dedicated styles: `assets/css/bible.css`
- Metadata source: `assets/data/bible-books.json`
- Scripture source: `bible-data/*.json`

### Component Structure

1. Hero + Verse of the Day widget
2. Sticky Quick Navigation (book/chapter jump + search/plans/audio anchors)
3. Bible Index
4. Chapter Grid
5. Recently Viewed
6. Chapter Reader
7. Verse Modal Panel
8. Search Panel
9. Audio Bible Panel
10. Reading Plans Panel

## URL and Deep Linking

- `/bible`
- `/bible/:bookSlug`
- `/bible/:bookSlug/:chapter`
- `/bible/:bookSlug/:chapter/:verse`

Static-host fallback is supported via hash routes:

- `bible.html#/bible/john/3`
- `bible.html#/bible/john/3/16`

## Frontend Storage Model

Stored in `localStorage` for standalone deployment:

- `zgm-bible-bookmarks`
- `zgm-bible-recents`
- `zgm-bible-progress`
- `zgm-bible-reading-plans`
- `zgm-bible-last-reading`

## API Structure

Base: `/api`

Bible content:

- `GET /api/bible/books`
- `GET /api/bible/:bookSlug`
- `GET /api/bible/:bookSlug/:chapter`
- `GET /api/bible/:bookSlug/:chapter/:verse`
- `GET /api/bible/search?q=grace&scope=all&page=1&limit=20`
- `GET /api/bible/audio/:bookSlug/:chapter`

User state:

- `GET /api/user/:userId/bible/state`
- `PATCH /api/user/:userId/bible/state`

Example state payload:

```json
{
  "bookmarks": [
    {"bookSlug": "john", "chapter": 3, "verse": 16}
  ],
  "progress": {
    "john:3": {"scrollTop": 240, "updatedAt": 1760066000000}
  },
  "plans": {
    "one-year": {"completedDays": 12}
  },
  "recents": [
    {"slug": "john", "book": "John", "chapter": 3, "ts": 1760066000000}
  ]
}
```

## Loading, Error, and Performance Strategy

- Async loading with loading placeholders for chapter/search.
- Graceful error messaging for failed fetches.
- Chapter-level loading (lazy) to reduce initial payload.
- Paginated search results.
- Cached book chapter responses in-memory on frontend and API.
- Supports SEO-friendly canonical route design.

## Accessibility

- Keyboard-accessible buttons and controls.
- ARIA labels for verse controls and quick navigation.
- Skip-link and modal close with Escape.
- Sufficient semantic structure with headings and nav regions.
