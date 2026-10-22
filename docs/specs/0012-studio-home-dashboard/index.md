# 0012. Studio home dashboard: what needs you today, then a compact status overview

**Date**: 2026-10-22
**Status**: Accepted
**Visual**: https://claude.ai/artifact/JW6w2fn6o4Tn3UDrJ4qnPQ

## Summary

The studio home page at `/studio` changes from a plain list of status lines into a dashboard that answers "what needs me today" first. A row of four counts (inquiries, contracts, retention, public export) sits on top, each with its three oldest items, then three small status bars for clients, contracts, and projects, then a quiet footer for database and storage health. It reads only tables and helpers that already exist, so there is no migration, no new environment variable, and no new library.

## Requirements

**User stories**:
- As the studio owner, I want to open `/studio` and see at once which inquiries, contracts, retention reviews, and export changes are waiting on me, so I act on them before they go stale.
- As the studio owner, I want a quick picture of how my clients, contracts, and projects are spread across their statuses, so I know the shape of the business without opening each list.
- As the studio owner, I want to know when the database or file storage is broken, without system lines crowding the page when everything is fine.

**Acceptance criteria**:
- **AC-1**: `/studio` calls `requireStudioAccess()` before any read. A signed out visitor is redirected to `/studio/login?next=/studio` exactly as today, and no signal, count, or name reaches them.
- **AC-2**: A count strip shows four tiles in this fixed order: Inquiries, Contracts, Retention, Public export. Each tile shows its count and links to its section below. A tile whose count is 0 renders dimmed and stays in place. At 375px wide the strip is a 2 by 2 grid with no horizontal page scroll.
- **AC-3**: The Inquiries tile counts inquiries in the current workspace whose status is `new` or `reviewing`, and separately counts inquiries whose owner alert is `failed` or `unknown` (an alert stuck in `sending` past its lease counts as `unknown`, the same mapping the inbox uses). The tile reads like `3 open · 1 alert failed`. Its list shows the 3 oldest open inquiries by `created_at`, each row with the visitor name, the company when given, its age, and a red mark when its alert is failed or unknown. Each row links to `/studio/inquiries/[id]`. The list ends with `See all` to `/studio/inquiries`, plus `Check alerts` to `/studio/inquiries?alert=attention` when the alert count is above 0.
- **AC-4**: The Contracts tile counts non archived contracts with status `sent` and with status `draft`, shown as two numbers (`2 sent · 1 draft`). Its list shows up to 3 rows: sent contracts first, then drafts, each group oldest first by the time of its latest status event. Each row shows the contract title, the client name, the status, and the age since that status change, and links to `/studio/contracts/[id]`. `See all` goes to `/studio/contracts?status=sent` (or `?status=draft` when no contract is sent).
- **AC-5**: The Retention tile counts records whose retention state is `eligible` (archived, due, and with no blockers), using the same classification as the retention list. Its list shows the 3 with the earliest due date, each row with the kind (Client or Contact), the name, and how long ago it fell due, linking to `/studio/retention/[kind]/[id]`. `See all` goes to `/studio/retention?state=eligible`.
- **AC-6**: The Public export tile compares the published systems in the database with the bundled `utils/data/products-data.ts` using the existing `diffPublic()`. When they differ it shows the number of differences and `Out of date`, lists the first 3 difference lines, and links to `/studio/systems`. When they match it shows `In sync`, dimmed.
- **AC-7**: When all four counts are 0 (no inquiries open, no failed alerts, no sent or draft contracts, nothing eligible, no export difference) and every signal loaded, one `All clear` card replaces the strip and the lists, and the overview moves up under it. The `All clear` card never shows while any signal failed to load.
- **AC-8**: Below the attention area, three horizontal stacked bars show non archived clients by status (lead, active, past), contracts by status (draft, sent, signed, active, ended, cancelled), and projects by status (planned, active, on hold, done, cancelled), in the current workspace. Each bar has a legend listing every status with its count and label, so the numbers never depend on color alone. A bar with a total of 0 shows `No clients yet` (or contracts, projects) instead. Each client segment and legend entry links to `/studio/clients?status=<status>`, each contract one to `/studio/contracts?status=<status>`; the project bar is display only.
- **AC-9**: A quiet footer strip at the bottom shows the database line and the file storage line with the same wording as today (`Connected, N migrations applied`, `Private store reachable`, and their failure wording), each with a green dot, plus the seven record counts from spec 0004 (clients, contacts, projects, contracts, notes, systems, system links) on one line. A failing check turns its dot and text red.
- **AC-10** (revised 2026-10-22, see *Database outage before the guard*): Three cases.
  - **Session lookup fails** (database unreachable, or the `studio.sessions` table missing): any `/studio` request that carries a session cookie gets the studio outage screen from `src/app/(studio)/studio/error.tsx`: heading `Studio is unavailable`, one fixed line (`The studio could not reach its database. Nothing was changed. Try again in a moment.`), and a `Try again` button that reloads the whole document. The screen is the same for the signed in owner and for anyone with a forged or stale cookie: no error message, no state name (`not reachable` or `not migrated`), no owner name, no navigation, no signal, and no count. It never lets a request past the guard. A request with no session cookie still redirects to the login page (AC-1, unchanged).
  - **The guard passes but the database check does not** (`getDatabaseStatus()` is not `migrated`, for example the database drops between the two reads or the migration journal is missing): one red card at the top says which (`Database not reachable` or `Database not migrated`). The strip, lists, overview bars, and record counts are hidden, and the footer shows the red database line.
  - **Only file storage is unreachable**: a red `File storage not reachable` card shows above the strip, and everything else renders normally.
- **AC-11**: Each signal and the overview load independently. If one read throws, only that tile shows `!` instead of a number and its list says `Could not load`, the other signals and the overview render normally, and the server logs only the signal name and the error code or class name, never row data.
- **AC-12**: The page shows no inquiry message text, email address, phone, contract amount, or note text. It adds no query parameter that carries personal data, no new environment variable, and no import of `src/studio/` from public code; `npm run build` still ends with `[leak-check] clean`.
- **AC-13**: Every load reads current data (the studio layout is already dynamic; nothing on the page is cached). The page renders correctly in light and dark themes and at 375px and desktop widths.

## Decision

**Chosen option**: Option 2: an attention first dashboard, server rendered from existing reads.

Rebuild `src/app/(studio)/studio/(signed-in)/page.tsx` as a server component that runs one guarded read per signal plus the overview and health checks in parallel, contains each failure to its own section, and draws the bars with plain Tailwind elements, adding a small `src/studio/data/home.ts` read module and no schema change.

**Design source**: real web app screens found with Refero research mode on the free plan (2026-10-22), drawn in the existing studio look (stone neutrals, `red-orange` focus ring, bordered rounded panels, the classes already in `src/app/(studio)/studio/_components/ui.ts`):
- **Aboard** (home): page structure, a row of counts on top with one expandable section per kind below.
- **Linear** (inbox): the attention row, dense, one line, title left, age right, a small status mark.
- **Wrike** (dashboard): the overview area, numbers first, then small charts; use the three status bars, not a donut.
No Refero MCP is connected; the references are recorded by name, and `/develop` builds to the wireframes in this spec's visual page rather than to pixel copies.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.claude/skills/tailwindcss-advanced-layouts/`) · `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Page composition** (top to bottom):
1. Health card (only when AC-10 applies).
2. Count strip (AC-2), or the `All clear` card (AC-7).
3. Attention sections in strip order, each with its top 3 rows and links (AC-3 to AC-6). A section with a count of 0 is omitted; its dimmed tile stays.
4. Overview: three status bars with legends (AC-8).
5. Health footer (AC-9).

**Component inventory**:
- Existing: `StatusBadge.tsx`, the class strings in `ui.ts` and `styles.ts`, `statusLabel()` and `formatDateTime()` from `src/studio/format.ts`.
- New, under `src/app/(studio)/studio/(signed-in)/_home/`: `CountStrip.tsx`, `AttentionSection.tsx` (heading, rows, `See all`, the `Could not load` state), `AttentionRow.tsx`, `StatusBar.tsx` (stacked bar plus legend, optional link per status), `HealthFooter.tsx`, `HealthCard.tsx`, `AllClear.tsx`. All are server components; none needs `"use client"`.
- No chart library. Each bar is a flex row of `div`s whose widths are percentages of the total, with the legend as the text equivalent.
- Assets: none (icons only, from `react-icons`, already installed).

**Data model sketch**: no change. Reads only existing tables in the `studio` schema: `inquiries`, `inquiry_alerts`, `contracts`, `contract_status_events`, `clients`, `projects`, `systems`, `system_links`, and the retention candidates over `clients` and `contacts`.

**State transitions**: none. The page only reads.

**Read surface** (server functions, not HTTP endpoints; every one resolves the workspace through `getWorkspaceId()` and runs after `requireStudioAccess()`):

| Function | Module | Returns | Key errors |
|---|---|---|---|
| `getInquirySignal()` | `src/studio/data/home.ts` (new) | `{ open, alertProblems, rows: { id, name, company, createdAt, alertProblem }[3] }` | throws on query error, caught per signal |
| `getContractSignal()` | `src/studio/data/home.ts` | `{ sent, draft, rows: { id, title, clientName, status, changedAt }[3] }` | same |
| `getRetentionAttention(limit)` | `src/studio/retention/service.ts` (added beside `listRetention`) | `{ eligible, rows: { kind, id, name, dueAt }[] }` | same |
| `getExportDriftSignal()` | `src/studio/data/home.ts`, over `getPublicProjection()` and `diffPublic()` | `{ differences: string[] }` | same |
| `getStatusOverview()` | `src/studio/data/home.ts` | `{ clients, contracts, projects }`, each a `Record<status, number>` | same |
| `getDatabaseStatus()`, `isStoreReachable()`, `getRecordCounts()` | existing | as today | as today (counts hidden on failure, spec 0004) |

The page calls `getDatabaseStatus()` first (after the guard). When the state is not `migrated` it renders the AC-10 red card and makes no other database read. Otherwise it runs the five signal and overview reads, `isStoreReachable()`, and `getRecordCounts()` with `Promise.allSettled`, and passes each settled result to its section.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Inquiries tile | open count | `count(*)` of `inquiries` where `workspace_id` = session workspace and `status in ('new','reviewing')` |
| Inquiries tile | alert problem count | `inquiries` joined to `inquiry_alerts` where state is `failed` or `unknown`, or `sending` with `lease_expires_at <= now()` (the inbox mapping in `listInquiries`) |
| Inquiry row | name, company, created time, id | `inquiries.name`, `inquiries.company` (omitted when null), `inquiries.created_at`, `inquiries.id`; ordered `created_at asc, id asc`, limit 3 |
| Inquiry row | red alert mark | derived from the same alert state mapping for that row |
| Contracts tile | sent and draft counts | `count(*)` of `contracts` with `archived_at is null`, grouped by `status` for `sent` and `draft` |
| Contract row | title, client name, status, id | `contracts.title`, `clients.name` via `contracts.client_id`, `contracts.status`, `contracts.id` |
| Contract row | age since status change | `max(contract_status_events.changed_at)` for that contract; order sent first, then draft, each by that time ascending, limit 3 overall |
| Retention tile | eligible count and rows | the `classified` set in `retention/service.ts` filtered to `state = 'eligible'`; rows ordered `due_at asc, id asc`, limit 3; `kind`, `id`, `name`, `due_at` from the candidate columns |
| Export tile | difference count and first 3 lines | `diffPublic(await getPublicProjection(), { products, productLinks })`, the same call the systems board makes |
| Every age | `2d`, `5h`, `just now`, `due 12d ago` | derived from the row timestamp and the server's request time; whole minutes, hours, then days; full date and time in the row's `title` attribute via `formatDateTime()` (`STUDIO_TIME_ZONE`) |
| Overview bars | per status counts | `count(*)` grouped by `status` from `clients`, `contracts`, `projects` with `archived_at is null` in the workspace; statuses missing from the result are 0; status order from `CLIENT_STATUSES`, `CONTRACT_STATUSES`, `PROJECT_STATUSES` |
| Overview labels | status text | `statusLabel()` in `src/studio/format.ts` |
| Bar segment links | URL | `/studio/clients?status=<status>`, `/studio/contracts?status=<status>`, the params those lists already parse (spec 0006, spec 0007) |
| Footer | database and storage lines | `getDatabaseStatus()` and `isStoreReachable()`, wording from today's `databaseLine()` |
| Footer | seven record counts | `getRecordCounts()` (spec 0004) |
| All clear | whether to show it | derived: every signal settled `fulfilled` and open, alert problems, sent, draft, eligible, and differences are all 0 |
| Every read | workspace | `getWorkspaceId()` from the session (never a constant) |

**Key invariants**:
- The strip order never changes: Inquiries, Contracts, Retention, Public export.
- No count includes another workspace's rows or an archived contract, client, or project.
- A failed signal never renders as 0, and never lets `All clear` show.
- The retention count and rows come from the same classification the retention list uses, so the two pages never disagree.
- The drift result comes only from `getPublicProjection()`; no private system column is read.

**Database outage before the guard** (AC-10, first case):
- Why the page cannot show its own card: `requireStudioAccess()` proves who you are by reading `studio.sessions` (`getStudioSession()`, `src/studio/auth/session.ts`). With the database down that read throws, and it throws in `(signed-in)/layout.tsx` before the page runs. Without the database nobody can be told apart from the owner, so no page can show owner only detail during an outage. That is fail closed by design (spec 0005) and stays as is.
- The guard and `getStudioSession()` do not change. No try/catch is added around the lookup, no typed outage error, no fallback that renders anything after a failed lookup.
- New file `src/app/(studio)/studio/error.tsx` (`"use client"`), one level above `(signed-in)`. Next's `error.tsx` does not catch its own segment's layout, so the boundary must sit above `(signed-in)/layout.tsx` to catch the guard. It also covers the `(auth)` login and setup pages, which hit the same database; the same generic screen fits them.
- The screen uses fixed text only, in the style of the existing per list `error.tsx` files (`card`, `primaryButton` from `_components/ui.ts`). It never reads `error.message` or `error.digest` into the page. `Try again` calls `window.location.reload()`, the studio rule for retrying a failed server response (as on the retention error screen), not `reset()`.
- It renders inside the studio root layout (`src/app/(studio)/layout.tsx`), which does not touch the database, so the page keeps the studio font, theme, and `noindex`.
- Logging stays with Next's own server error log (the digest matches the line). No new log line.
- The existing per section `error.tsx` files under `(signed-in)/` keep catching their own page errors; the new boundary only receives what they cannot (layout errors, and pages without a boundary of their own, such as `/studio`).

**Security model**: owner only, as every signed in studio page (spec 0005). The page and layout call `requireStudioAccess()`; the proxy is a first filter only. The page shows visitor names and company names, which the inbox already shows to the same owner; it shows no email, message, amount, or note text (AC-12). No new route handler or server action, so no new write path. All new modules in `src/studio/` start with `import "server-only"` and import `@/studio/marker`. The page remains `noindex` through the studio layout and the `X-Robots-Tag` header.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: seeded dev branch with 2 new inquiries (one with a failed alert), 1 sent and 1 draft contract, 1 eligible archived client, and one changed published system. The strip reads `2 open · 1 alert failed`, `1 sent · 1 draft`, `1`, `1 difference`; each section lists the right rows oldest first with working links. Verifies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
- All clear: a branch with none of the above shows only the `All clear` card, then the bars. Verifies **AC-7**.
- One signal fails: mock `getContractSignal()` to throw; the Contracts tile shows `!` and `Could not load`, the other three and the bars render, and `All clear` does not show even if the rest are 0. Verifies **AC-11**, **AC-7**.
- Database down before the guard (runtime): with `DATABASE_URL` pointed at an unreachable host, and again on a database with no studio tables, a request with a session cookie shows `Studio is unavailable` with `Try again`; the HTML has no owner name, nav, strip, count, state name, or error text. A request with no cookie still redirects to the login page. A forged cookie gets the same outage screen. Verifies **AC-10**, **AC-1**.
- Outage screen (DOM): render `studio/error.tsx` with an error whose message holds a secret string; the string never appears, and `Try again` calls `window.location.reload`. Verifies **AC-10**.
- Database down after the guard (DOM): `getDatabaseStatus()` returns `not-connected`; only the red card and the red footer line render, and no other database read runs. Verifies **AC-10**.
- Storage down: `isStoreReachable()` returns false; the red storage card shows above a normal strip. Verifies **AC-10**.
- Bars: counts per status match the seeded rows, archived rows are excluded, a client segment links to `/studio/clients?status=lead`, the project bar has no links, an empty entity shows `No projects yet`. Verifies **AC-8**.
- Footer: shows the migration count and all seven record counts. Verifies **AC-9**.
- Auth: a signed out request to `/studio` redirects to the login page with no dashboard markup in the response. Verifies **AC-1**.
- Privacy and boundary: the rendered HTML contains no inquiry email or description and no contract amount; `npm run build` ends `[leak-check] clean`. Verifies **AC-12**.
- Layout: at 375px the strip is 2 by 2 with no horizontal scroll, in light and dark themes (Playwright mobile and desktop projects). Verifies **AC-2**, **AC-13**.

## Build plan

Tracer Bullet (project default): the first task ships a working page end to end with one real signal, then each task adds a signal or the overview.

1. Thin thread. Add `src/studio/data/home.ts` with `getInquirySignal()`. Rebuild `page.tsx`: database check first with the AC-10 card, then `Promise.allSettled` over the inquiry signal, `isStoreReachable()`, and `getRecordCounts()`. Add `CountStrip` with only the Inquiries tile (later tasks add the other three), `AttentionSection`, `AttentionRow`, `HealthCard`, `HealthFooter` (moving today's lines and counts into it). Add the per signal `Could not load` state and the log line. Satisfies **AC-1**, **AC-3**, **AC-9**, **AC-10**, **AC-11**.
2. Contracts signal: `getContractSignal()` with the latest status event join, its section, and links. Satisfies **AC-4**.
3. Retention signal: `getRetentionAttention(limit)` in `retention/service.ts` over the shared `classified` set, its section, and links. Satisfies **AC-5**.
4. Public export signal: `getExportDriftSignal()`, its section with the first 3 difference lines. Satisfies **AC-6**.
5. Strip complete: fixed order, dimmed zero tiles, the 2 by 2 mobile grid, and the `All clear` card. Satisfies **AC-2**, **AC-7**.
6. Overview: `getStatusOverview()`, `StatusBar` with legend, segment links for clients and contracts, empty states. Satisfies **AC-8**.
7. Checks: DOM tests for the page states (happy, all clear, one failed signal, database down, storage down), database tests for each signal query on fake seed data, Playwright desktop and 375px runs in both themes, `npm run lint`, and `npm run build` ending `[leak-check] clean`. Satisfies **AC-12**, **AC-13**, and confirms the rest.
8. Outage screen (added 2026-10-22 after verify): add `src/app/(studio)/studio/error.tsx` per *Database outage before the guard*, with a DOM test beside it (`error.test.tsx`: fixed text, no error text, reload on `Try again`). Leave `guard.ts`, `session.ts`, and the signed in layout unchanged. Satisfies **AC-10** (first case) and keeps **AC-1**.

## Consequences

**Positive**:
- Opening `/studio` tells you what to do next, and every waiting item is one click from its record.
- No migration, no new dependency, no new route: a revert of one commit fully undoes it.
- Retention and export state reuse the exact logic of their own pages, so the home page cannot drift from them.

**Negative / tradeoffs**:
- About ten small queries per load instead of one. Fine at a one person studio's volume; worth a look only if the page is measured slow.
- The record counts from spec 0004 AC-8 shrink to one footer line. This spec replaces how AC-8 is presented, not what it counts.
- The drift check loads the bundled products file and the public projection on every home visit, work the systems board already does.
- Visitor names appear on the home page, which matters when you share your screen.
- During a database outage you see only `Studio is unavailable`, not which failure it is. To tell `not reachable` from `not migrated` you read the server log (Vercel or the dev terminal). That is the price of never showing detail to someone the studio cannot identify.
- Anyone who sends a made up session cookie during an outage learns that the studio is down. They learn nothing else, and the public site is unaffected.

**Neutral**:
- New `_home/` component folder beside the signed in pages.
- `retention/service.ts` gains one exported read; its write paths are untouched.

## Migration plan

**Strategy**: no migration needed. One deploy; rollback is reverting the commit.

## Follow-up

- [ ] After the build, `/sync` should note in spec 0004 (AC-8) and `src/studio/AGENTS.md` that the record counts now live in the home footer, per this spec.
- [ ] If you later connect the Refero MCP (Pro), future studio screens can pull references directly; this spec does not depend on it.
- [ ] After the build, `/sync` should note in `src/studio/AGENTS.md` that `src/app/(studio)/studio/error.tsx` is the studio wide outage screen and must stay fixed text only.
- [ ] Separate from this feature: the Drizzle `Failed query` line Next logs on a failed session lookup includes the query parameters (the session token hash). The hash is not a usable cookie (spec 0005), but if you want cleaner logs, a later change can log only the error code or class name for that read.
- [ ] Projects have no list page, so the project bar is display only. A projects list with `?status=` would let it link too (a separate feature).

## References

**Project sources**:
- `AGENTS.md` and `src/studio/AGENTS.md`: the guard rule, `server-only` and the marker, the workspace rule, no `NEXT_PUBLIC_` studio variables.
- Spec 0004 (record counts, AC-8), spec 0005 (owner session), spec 0006 and 0007 (list `?status=` params), spec 0008 (`getPublicProjection()`, `diffPublic()`), spec 0010 (inquiry and alert states, the `attention` filter), spec 0011 (retention classification).

**Practices & standards**:
- Failure isolation per section (one failed read never blanks the page).
- Do not encode meaning in color alone (WCAG 1.4.1): each bar has a text legend.
- Measure before optimizing: no cache or summary table until a slow load is measured.

**Links**:
- Refero MCP getting started: https://doc.refero.design/mcp/getting-started.md
- Mobbin pricing: https://mobbin.com/pricing.md
