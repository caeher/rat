# Portable sandbox share links

RAT encodes a **versioned share payload** in the sandbox URL **fragment** (`#share=v1…`) so static GitHub Pages hosting can restore schema, relation data, and the expression without a backend.

## Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Safe full URL length | 6,000 characters | Works in email, chat, and older browsers |
| Decoded JSON (UTF-8) | 512 KB | Matches CSV upload cap; prevents memory abuse |
| Compressed fragment body | 750 KB | Rejects obviously hostile links early |

Sandboxes that exceed the URL budget use the **workspace JSON file** export format (`exportVersion: 1` from persistence) as a fallback. Import accepts full workspace exports from the Workspace panel or minimal share-only bundles.

## Privacy

Anyone with the link can decode and read the embedded data. Share dialogs state this explicitly. Payloads are validated and rendered as data only (no `eval` or HTML injection).

## Base path

Links are built with `withBasePath('/sandbox')`, so production paths include `/rat/sandbox` when `NEXT_PUBLIC_BASE_PATH=/rat`.

## Import behavior

Opening a share link never silently overwrites the current sandbox. Users choose **Import as new schema set** (default-friendly) or **Replace entire sandbox** (with confirmation when local edits exist).
