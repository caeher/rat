# Browser Sandbox Limits

RAT keeps all learner-defined schemas and relation data in memory. These limits keep the UI responsive on GitHub Pages without a backend.

| Limit | Value |
| --- | --- |
| Schema collections per session | 8 |
| Relations per schema | 12 |
| Attributes per relation | 16 |
| Rows per relation | 200 |
| Relation name length | 48 characters |
| Attribute name length | 48 characters |
| Schema collection name length | 64 characters |
| CSV upload size | 512 KB (524,288 bytes) |
| CSV preview rows in UI | 25 rows |

## CSV import

- Files are read with `File.text()` in the browser only (no upload server).
- UTF-8 BOM is stripped automatically.
- Delimiters: comma, semicolon, or tab (auto-detected from the header row).
- Quoted fields may contain delimiters and newlines; `"` is escaped as `""`.
- Duplicate header names are renamed (`name`, `name_2`, …) and reported in the preview.
- Empty cells: NULL when the column is nullable; otherwise validation fails unless you map empty string explicitly.
- Literal NULL: `NULL`, `null`, or `∅` in the cell (nullable columns only).
- Import is atomic: invalid cells block the import and list row/column diagnostics.

## Identifier rules

Relation and attribute names must match `[A-Za-z_][A-Za-z0-9_]*` (see [LANGUAGE_SPEC.md](./LANGUAGE_SPEC.md)). Reserved SQL/RA keywords are rejected.

## Supported column types

`string`, `number`, `boolean`, and `date` (ISO `YYYY-MM-DD`). NULL is allowed only when the column is marked nullable.

## Sample entry hints

- **Numbers**: `42`, `-3.5`, `1e6`
- **Booleans**: `true` / `false`
- **Dates**: `2024-06-01`
- **NULL**: leave the cell empty (nullable columns) or type `NULL`
- **Empty string**: type a single space or use edit mode; stored as `""` and shown as *(empty)*

Constants are defined in `lib/sandbox/constants.ts`.
