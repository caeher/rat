# Data privacy

RAT is designed for classrooms and self-study **without a backend**.

## What stays on your device

- Sandbox schemas, relation data, and query expressions
- Workspace history, saved expressions, exercise progress, and quiz scores (IndexedDB via `lib/persistence/`)
- Optional imports from CSV files (read locally with `File.text()`; never uploaded)

## What leaves your device

- **Nothing by default.** There are no analytics beacons or API calls to a RAT server in the open-source bundle.
- **Share links** encode a compressed snapshot in the URL fragment (`#…`). Anyone with the link can decode the payload in their browser; treat shared URLs like sharing a file.
- **Google Fonts** load from `fonts.googleapis.com` when you use the app (see `_document.tsx`). Host offline or swap fonts if your policy requires it.

## GitHub Pages deployment

The static site is served from GitHub’s CDN. GitHub may collect standard web server logs; RAT itself does not add server-side session storage.

## Clearing data

Use the workspace persistence panel to export a backup, clear history, or reset storage. Browser “Clear site data” removes IndexedDB entries for the origin.
