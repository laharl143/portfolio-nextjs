# Verify: Studio placement & stack · spec 0003 · updated 2026-10-19
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Local env note: `STUDIO_ENABLED` and the Blob token live in `.env.local`; the Neon dev branch URLs live in `.env.development.local` on purpose (so a local `next build` never sees a database). Never pull `DATABASE_*` into `.env.local`.

## UI / manual
- [ ] `npm run dev` with `STUDIO_ENABLED=true`, open `/studio` → heading "Studio", no public Header or Footer → AC-2, AC-4
- [ ] Database line on the dev branch after `npm run db:migrate` → `Connected, 1 migrations applied` (N matches `select count(*) from studio.__drizzle_migrations`) → AC-2, AC-7
- [ ] Database line on a fresh Neon branch with no migrations (point `.env.development.local` at it) → `Connected, not migrated` → AC-2
- [ ] Database line with a broken `DATABASE_URL` (wrong password) → `Not connected`, and no error text on the page → AC-2
- [ ] File storage line with the real `BLOB_READ_WRITE_TOKEN` → `Private store reachable` → AC-2
- [ ] File storage line with the token blanked → `Storage not reachable` → AC-2
- [ ] In the Vercel dashboard, `studio-dev` and `studio-prod` are both access mode `private`; `studio-dev` is connected to Development and Preview, `studio-prod` to Production only → AC-2
- [ ] View source on `/studio` → `<meta name="robots" content="noindex, nofollow">`, no Vercel Analytics script → AC-4
- [ ] `STUDIO_ENABLED` unset, `/studio` and `/studio/anything` → 404; with the proxy matcher removed temporarily, still 404 (from the guard) → AC-3

## Commands
- [ ] `npm run build` → logs `[migrate] skipping migrations (local build)`, route table shows `/` and `/products` as `○` and `/studio` as `ƒ`, ends with `[leak-check] clean` → AC-1, AC-5, AC-6
- [ ] Temporarily render `"__ed_studio_server_only__"` on `/products`, run `npm run build` → fails with `studio server marker in .next\server\app\products.html` (and `.rsc`); remove it, build passes → AC-5
- [ ] After a build, run `DATABASE_URL="postgres://u:<a 16+ char string that appears in index.html>@h/db" node scripts/check-studio-leak.mjs` → fails naming `DATABASE_URL password in …index.html`, never printing the value → AC-5
- [ ] `VERCEL=1 node scripts/check-studio-leak.mjs` with a studio secret unset → exits 1, naming the missing secret → AC-5
- [ ] Add `import "@/studio/db/client"` to a `"use client"` component, run `npm run build` → fails from `server-only`; revert → AC-5
- [ ] `grep -rl "__ed_studio_server_only__" .next/server` → found in a studio server chunk only; `.next/static` has none → AC-5
- [ ] `git ls-files | grep -E "\.env"` → only `.env.example`; it lists `STUDIO_ENABLED`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `STUDIO_PROD_DB_HOST`, `BLOB_READ_WRITE_TOKEN`, all empty → AC-8
- [ ] `git check-ignore .env.local .env.development.local` → both ignored → AC-8
- [ ] `VERCEL_ENV=preview DATABASE_URL_UNPOOLED=<dev unpooled url> STUDIO_PROD_DB_HOST=<dev host> node scripts/migrate-on-build.mjs` → exits 1, refuses to migrate → AC-6

## Value sourcing
- [ ] Gate: `STUDIO_ENABLED` values `true`, `TRUE`, `1`, unset → only `true` serves `/studio` → AC-3
- [ ] Database line: each of the three states above comes from `select 1`, `to_regclass('studio.__drizzle_migrations')`, and the journal count → AC-2
- [ ] Storage line: comes from `list({ limit: 1 })` with `BLOB_READ_WRITE_TOKEN` → AC-2
- [ ] Migration target: on a preview deploy, the log shows `migrations applied (preview)` against the preview's own Neon branch, never production → AC-6
- [ ] Leak check strings: marker always; DB passwords and Blob token when set (on Vercel all must be set) → AC-5

## Acceptance-criteria coverage
- AC-1: build route table step · AC-2: shell steps, Blob dashboard step · AC-3: gate steps · AC-4: view source and no Header/Footer · AC-5: leak check, marker, `server-only` steps · AC-6: migrate steps · AC-7: journal count · AC-8: `.env.example` and ignore steps
