# 0003. Studio placement and stack: rationale

## Context

> ⚠️ Premise note: the scope recorded a lean toward a separate private deploy, so that client data, contract PDFs, and their secrets never ship with the public site. You chose one codebase and one deploy instead. That works, but it moves the whole safety burden onto two things: the studio guard (feature 21 login plus the `STUDIO_ENABLED` flag) and the leak check. The database URL and the Blob token will sit in the same Vercel project as the public site, so any server side bug in a public route could, in principle, reach them. The spec answers this with defense in depth (proxy plus a guard in every page and action, `server-only` imports, a build time leak check), not with deploy isolation. If the studio later holds real client contracts at volume, revisit Option 2 below; the code layout here (everything studio lives under `src/studio/` and `src/app/(studio)/`) is designed so that move stays a folder lift, not a rewrite.

> ⚠️ Premise note: the scope said "stays on Next.js 14 unless you approve otherwise". You approved an upgrade to Next 16 during this design. That upgrade touches every public page (React 19, async request APIs, `next lint` removed), so it is sequenced as its own first milestone, verified on the public site alone before any studio code lands.

You want a private studio where you run your freelance business: clients, contracts with PDF export, and the full SMB systems map with its private fields. It is an early version of your CRM and Invoicing products, with you as the only user. Every later studio feature (20 data model, 21 login, 22 client tracking, 23 contracts, 24 systems map) builds on where the studio lives and what it stores data in, so this is the first load bearing call.

The public site today is a Next.js 14.2.18 App Router app on Vercel with two routes (`/`, `/products`), no database, no auth, no file storage, and no secrets. Its privacy rule (spec 0002) is that private fields never enter the repo or the bundle. The studio breaks that assumption on purpose: it holds private data, so the question becomes how to keep that data, and the credentials that reach it, away from the public surface.

The forces: one engineer with limited time, so operational load must stay tiny; the studio may sit unused for a week or more, so a database that pauses itself is a real risk; contract PDFs must never be publicly reachable; the schema must grow into CRM and Invoicing without a breaking migration; and the free tiers should cover a single user. If this is not decided, every studio feature either stalls or guesses its own storage and placement, and the guesses drift apart.

## Options considered

### Option 1: Gated `/studio` route group in this app, one deploy, Neon + Drizzle + private Vercel Blob (chosen)

The studio is a route group inside the existing app, with its own root layout, served from the same Vercel project. Data lives in Neon Postgres (in a dedicated `studio` schema) through Drizzle; PDFs live in a private Vercel Blob store. A `STUDIO_ENABLED` flag keeps the studio returning 404 in production until login ships.

**Pros**:
- One app, one deploy, one set of dependencies: the least to operate for one person (basis: monolith first for a team of one).
- Neon and Vercel Blob both install from the Vercel dashboard and inject their env vars, so setup is a few clicks and nothing new to host.
- Neon never pauses the project (it only sleeps compute after 5 minutes idle and wakes in about a second), so an unused week costs nothing.
- Shared components, Tailwind theme, and types are reused directly.

**Cons**:
- Studio secrets live in the public deploy's environment; protection relies on code (guards, `server-only`, leak check), not on deploy isolation.
- A failed studio migration during a production build blocks public site deploys too.
- The Next 16 upgrade is a prerequisite and touches every public page.

### Option 2: Separate studio app in this repo, its own Vercel project

A second Next.js app in a `studio/` folder (or an npm workspace) deployed as its own private Vercel project, same Neon, Drizzle, and Blob choices.

**Pros**:
- Strongest isolation: the public deploy never holds a studio secret, and no public route bug can reach studio data.
- Studio migrations and deploys never block the public site.
- The studio can upgrade frameworks on its own schedule.

**Cons**:
- Two apps to keep upgraded, two dependency trees, two Tailwind configs, and shared UI copied or extracted into a package.
- More setup up front (workspace config or a nested app, a second Vercel project with its own root directory).

### Option 3: One codebase, two deploys (studio compiled in only for the private project)

The `/studio` code lives in this app, but the public Vercel project builds with studio off (routes 404, no studio env vars), and a second private project builds the same repo with studio on.

**Pros**:
- One codebase, while the public deploy still holds no studio secret.
- Same reuse benefits as Option 1.

**Cons**:
- Two Vercel projects and two env sets to keep in sync for one codebase.
- Easy to misconfigure: one wrong env var on the public project silently turns the studio on there.

### Option 4: Gated `/studio` in this app on Supabase (Postgres, Storage, Auth in one)

Same placement as Option 1, but Supabase supplies the database, private storage buckets with signed URLs, and an auth service feature 21 could reuse.

**Pros**:
- One vendor for database, storage, and a ready login service.
- Private buckets and signed URLs are a mature pattern.

**Cons**:
- Free projects pause after 7 days without use, which is a real risk for a studio you might not open for a week; avoiding it means the $25 a month Pro plan.
- A second dashboard and account outside Vercel; env vars set by hand.
- Pulls the login decision (feature 21) forward into this one.

## Rationale

You chose Option 1 over my first recommendation (Option 2). Based on the forces above that is a defensible call: for one engineer, one app is materially cheaper to run, and the risk Option 2 removes (a public route reaching studio secrets) is one you can close well enough in code. What you accept consciously is that the guard, the `server-only` boundary, and the leak check are now load bearing, not optional polish; this spec makes each of them an acceptance criterion so they cannot quietly lapse. Option 3 was the middle ground (one codebase, isolated secrets), but it trades deploy isolation for an easy, silent misconfiguration, which is a worse failure mode for a single engineer than a visible one.

Neon wins the database on the "unused for a week" force alone: Supabase's free tier pauses the whole project after 7 days, and Neon's does not (basis: Neon and Supabase plan pages, checked 2026-10-14). Postgres itself is the boring, relational default the CRM and Invoicing growth path needs (basis: relational database as the default for relational domains). A dedicated `studio` Postgres schema leaves room for `crm` and `invoicing` schemas later without renaming tables.

Drizzle over Prisma 7 because Prisma 7 now requires ESM, driver adapters, and a separate config file, while Drizzle is a light TypeScript layer with reviewable SQL migration files (basis: Drizzle migrations docs; Prisma 7 upgrade notes as found in the landscape check). Private Vercel Blob over R2 or Postgres storage because private stores are now supported, reads go through your own guarded server code, and it stays in the same dashboard (basis: Vercel Blob docs; object storage, never files in the database).

Migrations run during the Vercel build, which you chose over applying them by hand. That is only safe with the guardrails recorded in the Decision: production builds migrate only production, preview builds migrate only their own throwaway Neon branch, local builds never migrate, and a failed migration fails the build so the previous deploy keeps serving.

## References

**Project sources**:
- `AGENTS.md`: stack, route and section conventions, the public data file rule
- `docs/scope/scope.md`: feature 19 intent, the separate deploy lean, the "stay on Next 14 unless approved" constraint, features 20 to 24
- Spec [0002](../0002-public-products-page/index.md): the public only data rule this spec must not weaken
- `package.json`: Next 14.2.18, React 18, `@vercel/analytics` (the site already runs on Vercel)

**Practices & standards**:
- Monolith first for a small team
- Relational database as the default for relational domains
- Object storage for files, never the database
- Defense in depth: never rely on middleware alone for route protection
- Expand and contract style, forward only migrations

**Links** (web verified 2026-10-14):
- Neon plans: https://neon.com/docs/introduction/plans
- Supabase pricing: https://supabase.com/pricing
- Vercel Blob (private stores): https://vercel.com/docs/vercel-blob
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- Next.js middleware bypass postmortem (CVE-2025-29927): https://vercel.com/blog/postmortem-on-next-js-middleware-bypass
