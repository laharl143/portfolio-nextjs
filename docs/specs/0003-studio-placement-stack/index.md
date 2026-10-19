# 0003. Studio placement and stack: gated `/studio` on Next 16, Neon, Drizzle, private Vercel Blob

**Date**: 2026-10-14
**Status**: In Progress

## Summary

Your private studio lives inside this same app at `/studio`, in its own route group (a folder that shares the app but has its own layout), and ships with the public site in one Vercel deploy. Data goes into Neon Postgres (a hosted database that sleeps when idle but never pauses your project) through Drizzle (a light, typed query layer), and contract PDFs go into a private Vercel Blob store (file storage with no public links). Before any studio code lands, the whole site moves from Next 14 to Next 16. Until login (feature 21) ships, a `STUDIO_ENABLED` flag keeps `/studio` returning "not found" in production, and a build check makes sure no studio code or secret ever reaches the public pages.

## Requirements

**User stories**:
- As Ed, I want an empty studio shell that boots locally next to the public site, wired to a real database and private file store, so that every later studio feature builds on a working thread instead of a guess.
- As Ed, I want the public site to look and behave exactly as before after the upgrade, so that the job hunting site never regresses because of the studio.
- As a public visitor, I can never reach a studio page, studio data, or a studio secret.

**Acceptance criteria**:
- **AC-1**: The site runs on Next 16 (an exact version pinned in `package.json`) with React 19. `npm run build` and `npm run lint` succeed, `/` and `/products` are still marked `○` (static) in the `next build` route table, and every check in spec 0001's and spec 0002's `verify.md` still passes (no public regression).
- **AC-2**: Locally, with `STUDIO_ENABLED=true` and the dev Neon branch and dev Blob token in `.env.local`, `npm run dev` serves `/studio` next to the public pages. The shell shows a heading, a database status line in one of three states (`Not connected` · `Connected, not migrated` · `Connected, N migrations applied`, N read from `studio.__drizzle_migrations`), and a file storage status line (`Private store reachable` or `Storage not reachable`).
- **AC-3**: When `STUDIO_ENABLED` is not exactly `true`, `/studio` and every `/studio/*` path return a 404. This holds through both layers on their own: the proxy (`src/proxy.ts`) and the `requireStudioAccess()` guard called by the studio layout, every studio page, and every studio server action.
- **AC-4**: Studio pages use their own root layout: no public Header or Footer, no Vercel Analytics script, a `noindex, nofollow` robots meta tag, and dynamic rendering (never prerendered). Public pages keep their existing layout, Analytics, and theme exactly as before.
- **AC-5**: The studio database client, storage client, and data layer import `server-only`, so importing any of them from a client component fails the build. After `next build`, a leak check script scans `.next/static/**` plus the `.html` and `.rsc` output of public routes under `.next/server/app/` (everything outside `studio`), and fails the build if it finds the studio server marker string, or the password or token part (16 characters or more) of any studio secret. On Vercel (`VERCEL=1`) the check fails if a studio secret it should scan for is missing; locally it logs which ones it skipped.
- **AC-6**: In the build, migrations run when `VERCEL_ENV` is `production` or `preview` and `DATABASE_URL_UNPOOLED` is set, independent of `STUDIO_ENABLED`, each against its own database: production against the production branch, each preview against its own Neon preview branch. A preview build whose database host equals `STUDIO_PROD_DB_HOST` refuses to migrate and fails. If `DATABASE_URL_UNPOOLED` is missing, the step skips with a logged warning while the flag is off, and fails the build when the flag is on. A local `npm run build` never migrates. Migrations run in one transaction under a Postgres advisory lock (a database level lock, so two builds cannot migrate at once); any failure exits non zero and fails the build.
- **AC-7**: Every studio table, and Drizzle's migrations journal (`studio.__drizzle_migrations`), lives in the Postgres schema `studio`. The first migration is a hand written one (`drizzle-kit generate --custom`) containing only `CREATE SCHEMA IF NOT EXISTS studio;`, so the pipeline is proven before feature 20 adds tables.
- **AC-8**: No secret is in the repo. `.env.example` lists every studio variable name with an empty value, and `.env*.local` stays git ignored.

## Decision

**Chosen option**: Option 1: Gated `/studio` route group in this app, one deploy, Next 16 + Neon + Drizzle + private Vercel Blob

The studio is a `(studio)` route group in this Next.js app with its own root layout, deployed with the public site, storing data in Neon Postgres (schema `studio`) through Drizzle and PDFs in a private Vercel Blob store, behind a `STUDIO_ENABLED` flag and a single guard function that feature 21 later fills with the real login check.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) for the Next 16 and React 19 upgrade and the Server Component and Action patterns · `neon-postgres` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres/`) for pooled vs direct connections and the serverless driver · `neon-postgres-branches` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres-branches/`) for the dev and per preview branches · `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) for the schema and drizzle-kit migrations · `shadcn-ui` (`jezweb/claude-skills`, `.claude/skills/shadcn-ui/`) for the shell's status card

**Approved scope change**: you approved leaving Next 14 for Next 16 during this design (2026-10-14). This overrides the scope's "stays on Next.js 14" line for feature 19.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Placement | `src/app/(studio)/studio/…` route group in this app, one Vercel deploy | One app to run for one engineer; isolation comes from guards and the leak check instead of a second deploy (your call, risk recorded in rationale.md). |
| Framework | Next.js 16, the latest stable at build time pinned to an exact version, React 19, App Router, Turbopack (the 16 default) for dev and build | Land on the current major once, rather than migrating to 15 and again to 16; the CVE fixed in later 14.2.x was never a risk on Vercel hosting. |
| Runtime | Node 20.9 or higher (set in the Vercel project settings) | Next 16's minimum. |
| Lint | ESLint 9 with flat config (`eslint.config.mjs`), migrated with the Next codemod (`next-lint-to-eslint-cli`) | `next lint` is removed in 16, and `eslint-config-next` 16 expects flat config. |
| Styling / UI | Tailwind 3 and shadcn/ui as today; add `./src/studio/**/*.{ts,tsx}` to the Tailwind `content` globs | No Tailwind 4 move in this feature; the theme and shadcn config stay untouched. |
| Primary DB | Neon Postgres via the Vercel Marketplace integration, with its "create a branch for each preview deployment" setting on | Relational, never pauses the project on the free tier (1 GB, 100 CU hours), branches give a dev DB and per preview DBs. |
| DB namespace | Postgres schema `studio` (`pgSchema('studio')`) | Leaves room for `crm` and `invoicing` schemas when those products split out. |
| ORM / migrations | Drizzle ORM with the Neon serverless WebSocket driver (`drizzle-orm/neon-serverless`, `Pool` from `@neondatabase/serverless`) at runtime and in the migrate script; `drizzle-kit generate` for SQL migration files | Typed, light, reviewable SQL; the WebSocket driver supports transactions, which the migrate script needs now and contract status history (feature 23) needs later. The HTTP driver does not. |
| Packages | `drizzle-orm`, `@neondatabase/serverless`, `@vercel/blob` (a version with private store support), `server-only`; dev: `drizzle-kit` | Everything the stack needs, nothing else. |
| Data access | Server Components for reads, Server Actions for writes, all through a `server-only` data layer in `src/studio/` | No public JSON API to protect; the least code. |
| File storage | Vercel Blob, two private stores (access mode `private`, fixed at store creation): `studio-dev` connected to Development and Preview, `studio-prod` connected to Production only | No public URL ever; reads go through guarded server code; local dev and previews never touch production files. |
| Gate (until feature 21) | `STUDIO_ENABLED` env flag checked in `src/proxy.ts` (returns `new NextResponse(null, { status: 404 })`) and in `requireStudioAccess()` (calls `notFound()`) | Studio returns 404 in production until login ships; two independent layers. The proxy alone is never enough: layouts and pages render separately, and server actions can be POSTed to any route path. |
| Auth | Deferred to feature 21; this spec only fixes the contract (`requireStudioAccess()` is the one place it plugs in) | Keeps the login choice its own decision. |
| Hosting | Vercel, the existing project | The public site already runs there. |
| Local dev DB | A `dev` branch of the Neon project, URL in `.env.local` | Same Postgres as production, no Docker, one click reset. |
| Observability | Vercel runtime and build logs; the shell's status lines | No error tracking service yet for a single user tool; revisit when real client data arrives (Follow-up). |

### Code layout

| Path | Holds |
|---|---|
| `src/app/globals.css`, `src/app/favicon.ico` | Stay where they are; both root layouts import `../globals.css`. |
| `src/components/AppProviders.tsx` | Shared `ThemeProvider` wrapper used by both root layouts; the Archivo font is declared in a shared module (`src/lib/fonts.ts`) and applied in each layout. |
| `src/app/(site)/layout.tsx` | The current root layout moved here (`<html>`, `<body>`, fonts, `AppProviders`, Analytics), same output as today. |
| `src/app/(site)/page.tsx`, `src/app/(site)/products/`, `src/app/(site)/not-found.tsx` | The current public routes, moved, unchanged, plus the public 404 page. |
| `src/app/(studio)/layout.tsx` | Studio root layout: own `<html>` and `<body>`, same font and `AppProviders`, no Analytics, robots `noindex, nofollow`, `export const dynamic = "force-dynamic"`, calls `requireStudioAccess()`. |
| `src/app/(studio)/not-found.tsx` | A plain 404 for the studio group (no studio wording). |
| `src/app/(studio)/studio/page.tsx` | The shell: calls `requireStudioAccess()`, then shows the heading plus the database and storage status lines. |
| `src/proxy.ts` | Next 16 proxy (Node runtime), matcher `["/studio", "/studio/:path*"]`, returns a bare 404 when the flag is off. |
| `src/studio/guard.ts` | `requireStudioAccess()`: today calls `notFound()` unless `STUDIO_ENABLED === "true"`; feature 21 adds the owner session check here. |
| `src/studio/db/client.ts`, `src/studio/db/schema.ts` | Drizzle client and schema (`pgSchema('studio')`), both `import "server-only"`. |
| `src/studio/storage/blob.ts` | Private Blob helpers, `import "server-only"`. |
| `src/studio/marker.ts` | `export const STUDIO_SERVER_MARKER = "__ed_studio_server_only__"`, imported by the data layer; the leak check searches for this string. |
| `drizzle.config.ts`, `drizzle/` | Drizzle Kit config: loads `.env.local` through `loadEnvConfig` from `@next/env` (drizzle-kit does not read it on its own), uses `DATABASE_URL_UNPOOLED`, `schemaFilter: ["studio"]`, `migrations: { schema: "studio", table: "__drizzle_migrations" }`; plus the committed SQL migrations. The migrate script passes the same `migrationsSchema` and `migrationsTable` so the CLI and the script never diverge. |
| `scripts/migrate-on-build.mjs` | Runs migrations only under the AC-6 conditions. |
| `scripts/check-studio-leak.mjs` | The AC-5 leak check. |

### Build and migration pipeline

- `package.json` scripts: `build` = `node scripts/migrate-on-build.mjs && next build && node scripts/check-studio-leak.mjs`; `db:generate` = `drizzle-kit generate`; `db:migrate` = `drizzle-kit migrate` (local, against the dev branch, run on purpose); `lint` moves off `next lint` (removed in 16) to the ESLint CLI.
- `migrate-on-build.mjs`, in order:
  1. Not on Vercel (`VERCEL_ENV` unset or `development`): log "skipping migrations (local build)", exit 0. Locally you run `npm run db:migrate` against the dev branch on purpose.
  2. `DATABASE_URL_UNPOOLED` missing: if `STUDIO_ENABLED === "true"`, exit 1; otherwise log a warning and exit 0.
  3. `VERCEL_ENV === "preview"` and the URL's host equals `STUDIO_PROD_DB_HOST`: exit 1 (fail closed, never migrate production from a preview).
  4. Open a `Pool` on `DATABASE_URL_UNPOOLED`, take `pg_advisory_lock` on a fixed key, run `CREATE SCHEMA IF NOT EXISTS studio`, then Drizzle's `migrate()` (`drizzle-orm/neon-serverless/migrator`, `migrationsFolder: "drizzle"`, `migrationsSchema: "studio"`, `migrationsTable: "__drizzle_migrations"`), which applies all pending migrations in one transaction; release the lock and close the pool. Any error exits 1.
- A preview build can occasionally race the Neon integration creating its branch; the remedy is a redeploy, never a manual migrate against production.
- Migrations are forward only and additive by default (add columns and tables, backfill, then remove in a later migration), because one deploy means a migration and the code that uses it ship together.
- `check-studio-leak.mjs`: scan set and rules are in AC-5. Secrets are matched by their password or token part (the password inside a connection URL, the Blob token itself), never shorter than 16 characters. It is a tripwire, not proof: it only sees build output, so dynamic studio responses are covered by the guard and `server-only`, not by this script.

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Studio gate (proxy and guard) | enabled or 404 | `process.env.STUDIO_ENABLED`, read at request time on the server (never `NEXT_PUBLIC_`) |
| Shell, database line | `Not connected` | `select 1` through `src/studio/db/client.ts` (`DATABASE_URL`) fails; no error text is shown |
| Shell, database line | `Connected, not migrated` | `select 1` succeeds, and `to_regclass('studio.__drizzle_migrations')` returns null |
| Shell, database line | `Connected, N migrations applied` | N = `select count(*) from studio.__drizzle_migrations` |
| Shell, storage line | `Private store reachable` / `Storage not reachable` | whether `list({ limit: 1 })` through `src/studio/storage/blob.ts` (`BLOB_READ_WRITE_TOKEN`) succeeds |
| Migration step | which DB to migrate | `DATABASE_URL_UNPOOLED` injected by the Neon integration per environment (production branch, or the preview's own branch) |
| Migration step | whether to migrate | `VERCEL_ENV` (set by Vercel), presence of `DATABASE_URL_UNPOOLED`, and `STUDIO_ENABLED` only to decide skip vs fail when the URL is missing |
| Migration step | is this preview pointed at production | URL host compared to `STUDIO_PROD_DB_HOST` |
| Leak check | strings to search for | `STUDIO_SERVER_MARKER` always; the password part of `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, and `BLOB_READ_WRITE_TOKEN`, when set at build time |

### Key invariants

- No studio module is imported by any file under `src/app/(site)/`, `src/sections/`, or `src/components/` (studio may import shared UI, never the reverse).
- No studio variable ever uses the `NEXT_PUBLIC_` prefix.
- Every studio page, layout, route handler, and server action calls `requireStudioAccess()` before reading or writing anything. The proxy is a first filter, never the only one.
- Contract PDFs are only ever written to the private Blob store and only ever read through guarded server code; no Blob URL is rendered to the browser.
- `utils/data/products-data.ts` stays public only (spec 0002); the studio never writes to it.

### Security model

One owner (you), no other roles. Until feature 21, nobody can reach the studio in production or preview, because the flag is off there; locally, anyone with your machine can. After feature 21, `requireStudioAccess()` checks the owner session as well as the flag. Data is client business data (names, contacts, contract terms), not regulated health or payment data; no compliance scope applies yet, but treat it as confidential: seed data stays fake (feature 20), no real client data in the repo or in preview branches.

### Configuration required

- `STUDIO_ENABLED`: `"true"` turns the studio on. Set in Development (local `.env.local`) only, until feature 21 ships; then also Preview (with Vercel Deployment Protection on) and Production.
- `DATABASE_URL`: pooled Neon connection for runtime queries (injected by the Neon integration in every environment; locally the `dev` branch, via `vercel env pull` or pasted from Neon).
- `DATABASE_URL_UNPOOLED`: direct Neon connection for migrations (injected by the integration).
- `STUDIO_PROD_DB_HOST`: the production branch's database host name (not a secret), set in Preview so a preview build can refuse to migrate production.
- `BLOB_READ_WRITE_TOKEN`: private Blob store token (`studio-dev` in Development and Preview, `studio-prod` in Production; locally via `vercel env pull`).
- `.env.example` lists all five names above with empty values. `vercel env pull` writes `.env.local`, which `.env*.local` already ignores.

### Critical test scenarios

- Happy path: on a fresh dev branch, `/studio` shows `Connected, not migrated`; after `npm run db:migrate`, `Connected, 1 migrations applied` and `Private store reachable`, verifies **AC-2**, **AC-7**
- Gate: flag off, `/studio` and `/studio/anything` return 404; with the proxy matcher temporarily removed, still 404 from the guard, verifies **AC-3**
- Boundary: a client component importing `src/studio/db/client.ts` fails the build (from `server-only`), verifies **AC-5**
- Leak script: temporarily render `STUDIO_SERVER_MARKER` on `/products`, the build fails in the leak check; remove it, the build passes, verifies **AC-5**
- Migration guard: local `npm run build` logs "skipping migrations (local build)"; running the script locally with `VERCEL_ENV=preview` and `STUDIO_PROD_DB_HOST` set to the dev branch's host fails closed; with a deliberately broken migration against the dev branch it exits 1 and leaves the journal unchanged, verifies **AC-6**
- Regression: rerun the 0001 and 0002 verify checklists on Next 16, verifies **AC-1**, **AC-4**

### Milestone order (Tracer Bullet)

You chose to upgrade first as its own milestone. Order for `/develop`, each ending working end to end, with the ACs `/check verify` checks at that point:

1. Next 16 and React 19 upgrade on the public site alone (codemods, ESLint 9 flat config, Turbopack), verified against 0001 and 0002, shipped. Verifies **AC-1**.
2. Route groups, the two root layouts, `AppProviders`, the studio layout, proxy, and guard, with the flag off, so the 404 path ships first. Verifies **AC-3**, **AC-4**.
3. Neon integration (with preview branches), Drizzle, the `studio` schema migration, and the migrate on build step. Verifies **AC-6**, **AC-7**.
4. The two private Blob stores, the shell status lines, the leak check, and `.env.example`. Verifies **AC-2**, **AC-5**, **AC-8**.

Dependency rule for the upgrade: a package with no React 19 peer range gets an npm `overrides` entry only if it actually works on React 19 (checked in milestone 1); otherwise replace it (for `react-fast-marquee`, the CSS loop already planned in feature 16).

## Consequences

**Positive**:
- One app, one deploy, one dependency tree; shared UI and theme are reused directly.
- Every later studio feature starts from a working thread: guarded route, database, file store, migrations.
- The public site lands on the current Next major, with no second migration soon.

**Negative / tradeoffs**:
- Studio secrets live in the public deploy's environment once the flag is on; the guard, `server-only`, and the leak check are load bearing and must never be skipped.
- A failed studio migration blocks public site deploys until fixed.
- The Next 16 upgrade risks regressions on the job hunting site (React 19 peer ranges, for example `react-fast-marquee`), which is why it ships alone first.
- Migrations in the build mean a destructive migration would run unattended; forward only, additive migrations are now a rule.

**Neutral**:
- The current root layout moves into `src/app/(site)/`; moving between the public site and the studio is a full page load (two root layouts).
- `next lint` goes away in 16; linting runs through the ESLint CLI.
- Moving the studio to its own deploy later (rationale Option 2) stays a folder lift: `src/studio/`, `src/app/(studio)/`, `drizzle/`.

## Follow-up

- [ ] Feature 21 (login) fills `requireStudioAccess()` with the owner session check and turns `STUDIO_ENABLED` on in Preview (with Deployment Protection) and Production.
- [ ] Feature 20 (data model) adds tables in the `studio` schema through `db:generate`, following the forward only, additive migration rule.
- [ ] Feature 23 decides whether PDFs are stored as sent (Blob) or regenerated; this spec only provides the private store.
- [ ] Revisit error tracking (a hosted error tracker) when real client data lands in the studio.
- [ ] Revisit a separate studio deploy (rationale Option 2) if the studio starts holding many real client contracts.
- [ ] The Vercel Blob skill you picked (`jezweb/claude-skills@vercel-blob`) is no longer published in that repo, so nothing was installed for Blob; follow the Vercel Blob docs for private stores, or add a Blob skill later if one appears.
- [ ] `/sync`: add the four new skills (`vercel-react-best-practices`, `neon-postgres`, `neon-postgres-branches`, `drizzle-orm`) to `AGENTS.md` `## Agent skills`, and record `Declined: Neon MCP, next-devtools-mcp` so they are not offered again.
- [ ] `/sync`: record the studio conventions (route groups, `src/studio/` is `server-only`, `requireStudioAccess()` everywhere, no `NEXT_PUBLIC_` for studio vars, forward only migrations) in `AGENTS.md`, and update its stack line to Next 16 and React 19.
