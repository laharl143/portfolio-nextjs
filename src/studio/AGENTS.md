# Studio (private back office)

Governing spec: [0003 studio placement and stack](../../docs/specs/0003-studio-placement-stack/index.md). The studio is a gated `/studio` area inside this app, shipped in the same Vercel deploy as the public site.

## Where things live

- `src/studio/guard.ts`: `requireStudioAccess()`, the one gate. Today it calls `notFound()` unless `STUDIO_ENABLED === "true"`; feature 21 (studio login) adds the owner session check here.
- `src/proxy.ts`: Next 16 proxy, matcher `/studio` and `/studio/:path*`, returns a bare 404 when the flag is off. A first filter only, never the real gate.
- `src/app/(studio)/layout.tsx`: studio root layout (own `<html>`, no Header, Footer, or Analytics, robots `noindex, nofollow`, `force-dynamic`).
- `src/app/(studio)/studio/page.tsx`: the shell with the database and file storage status lines.
- `src/studio/db/client.ts`: Drizzle over the Neon WebSocket driver (`drizzle-orm/neon-serverless`), pool created lazily on first use from `DATABASE_URL`.
- `src/studio/db/schema.ts`: tables in the Postgres schema `studio` (`pgSchema("studio")`).
- `src/studio/db/status.ts`, `src/studio/storage/blob.ts`: the shell's status checks; `blob.ts` is the private Vercel Blob helper.
- `src/studio/marker.ts`: `STUDIO_SERVER_MARKER`, imported by the data layer so the leak check can spot studio code in public output.
- `drizzle.config.ts`, `drizzle/`: drizzle-kit config and the committed SQL migrations.
- `scripts/migrate-on-build.mjs`, `scripts/check-studio-leak.mjs`: run inside `npm run build`.

## Rules

- Every studio layout, page, route handler, and server action calls `await requireStudioAccess()` before reading or writing anything. The proxy alone is never enough (server actions can be POSTed to any path).
- Every module in `src/studio/` that touches a connection, a secret, or data starts with `import "server-only"` and imports `@/studio/marker`. The one exception is `db/schema.ts`: it skips `server-only` on purpose because drizzle-kit loads it outside Next; it holds table shapes only, never a connection.
- Studio may import shared UI from `src/components/`; public code never imports from `src/studio/`.
- No studio variable uses the `NEXT_PUBLIC_` prefix. The variable names are listed, empty, in `.env.example`.
- Never render a Blob URL to the browser; contract PDFs are read only through guarded server code.
- Migrations are forward only and additive (add, backfill, then remove in a later migration), because they run unattended in the Vercel build. Every table and the journal (`studio.__drizzle_migrations`) live in the `studio` schema. Add tables with `npm run db:generate`, apply locally with `npm run db:migrate`.
- Seed and preview data stay fake; no real client data in the repo or in preview branches.

## Local env

- `.env.local` (from `vercel env pull`) holds `STUDIO_ENABLED` and `BLOB_READ_WRITE_TOKEN`.
- The Neon dev branch URLs (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) live in `.env.development.local` on purpose, so a local `next build` never sees a database. Never pull `DATABASE_*` into `.env.local`. `drizzle.config.ts` loads env in dev mode so drizzle-kit picks up this file.
- A local `npm run build` never migrates. The leak check logs which secrets it skipped locally; on Vercel a missing studio secret fails the build.

_Drafted by /sync from the introducing change, worth a quick human pass._
