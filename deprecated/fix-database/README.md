# Deprecated: fix-database tooling

This folder contains archived tooling that used to provide a developer UI and scripts for applying
Row Level Security (RLS) fixes to the database.

Moved on: 2025-10-03

Files archived here
- `page.tsx` — the Next.js client page that used to be available at `/fix-database`.
- `route.ts` — the Next.js API route that used to be available at `/api/fix-db`.
- `fix-database.js` — a root-level Node script that attempted to apply the same fixes via Supabase RPCs.

Why deprecated
- These tools were developer convenience utilities and were not referenced anywhere in the application's
  runtime flow or scripts. They expose SQL intended to be run manually or via a service role key, which
  is a sensitive operation. To reduce surface area and avoid accidental use in production, they have been
  archived.

How to restore
1. Move the files back to their original locations (git mv is recommended):

   - `deprecated/fix-database/page.tsx` -> `src/app/fix-database/page.tsx`
   - `deprecated/fix-database/route.ts` -> `src/app/api/fix-db/route.ts`
   - `deprecated/fix-database/fix-database.js` -> `./fix-database.js`

2. Ensure any required environment variables (like `SUPABASE_SERVICE_ROLE_KEY`) and developer warnings are
   present; running the script or exposing the page should be limited to local or secure admin environments only.

Notes
- This archive preserves the original files verbatim for reference or future reuse.
- If you want a smaller surface area but still keep a record, consider keeping only the SQL in a markdown file
  under `deprecated-sql-files/` and removing executable scripts.
