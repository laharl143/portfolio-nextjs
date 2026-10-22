# 0012. Rationale: studio home dashboard

## Context

The signed in studio home (`src/app/(studio)/studio/(signed-in)/page.tsx`) is a single bordered list: a database line, a file storage line, and seven record counts (spec 0003 and spec 0004, AC-8). It was the right shell while the studio was being built, because those lines proved the database, migrations, and private Blob store worked. Now the studio runs a real business: inquiries arrive from the public contact form (spec 0010), contracts move from draft to sent to signed (spec 0007), archived records fall due for review (spec 0011), and the public products file can fall behind the systems map (spec 0008).

Each of those waits on you in a different page, and nothing on the home page says so. An inquiry can sit in `new` for days, a sent contract can go unsigned, an owner alert email can fail, and the export can drift, all while the home page shows `Connected, 12 migrations applied`. The counts it shows (for example 15 systems, 21 system links) describe size, not action.

The forces: one owner, low volume (tens of rows, not thousands), a server rendered App Router studio on Neon with Drizzle, a strict guard and leak check, and a build approach that ships thin end to end slices. The owner thinks visually and wants the page useful at a glance on desktop and phone. The page must keep showing when the database or storage is broken, because that is when it matters most.

Not deciding leaves the studio as a set of separate lists you must remember to check.

## Options considered

### Option 1: Fix in place, add attention lines to the current list

Keep the bordered list and add four lines (open inquiries, sent contracts, retention due, export drift) as more rows, each linking to its page.

**Pros**:
- Smallest change, an hour of work.
- No new components.

**Cons**:
- Still a wall of equal weight text; the thing that needs you looks like `Notes 42`.
- Counts only, so every item is two clicks away.
- Nothing visual, which is the reason for the redesign.

### Option 2: Attention first dashboard, server rendered from existing reads (chosen)

A count strip, the three oldest items per signal, three status bars, and a quiet health footer, all from a server component that runs existing and new read functions in parallel and isolates each failure.

**Pros**:
- Answers "what needs me today" first, as you chose in round 1.
- Reuses the retention classification and `diffPublic()`, so it never disagrees with those pages.
- No migration, no dependency, no client JavaScript, one commit to revert.
- Works on the database down day, because the health card renders before any other read.

**Cons**:
- About ten queries per load.
- More components to maintain than the current list.

### Option 3: Client side dashboard with API routes and a chart library

Render the page shell, fetch each widget from new `/studio/api/...` route handlers in the browser, and draw charts with a library such as Recharts.

**Pros**:
- Widgets can refresh on their own.
- Richer charts (tooltips, animation).

**Cons**:
- Every route handler is a new guarded surface that must call `requireStudioAccess()` and pass the leak check.
- Adds a chart dependency and client JavaScript for three bars.
- Loading spinners on every visit, and a second round trip, for data that changes a few times a day.

### Option 4: Precomputed summary table refreshed on writes

Keep a `studio.home_summary` row updated by each write path (inquiry status, contract step, archive, import), and read one row on the home page.

**Pros**:
- One query per load.

**Cons**:
- Every write path in four specs must remember to update it; a missed one shows a wrong count forever.
- A migration and a backfill for a volume that needs neither.
- Premature optimization with no measured slow load.

## Rationale

Option 2 is the only one that turns the home page into a to do list while keeping the studio's two hardest rules intact: one guarded server render, and no data path the leak check has not seen. It reads the same tables the inbox, contracts list, retention list, and systems board already read, through the same helpers where they exist (`classified` retention set, `getPublicProjection()`, `diffPublic()`), so the counts on the home page match what you see when you click through. That consistency is worth more than saving queries at this volume.

Option 1 fails the brief: it is not visual and still makes you open each page. Option 3 buys refresh and animation you did not ask for at the cost of new guarded routes and a dependency, against the studio's habit of server rendered pages. Option 4 solves a performance problem that does not exist and spreads a fragile duty across every write path.

The per section isolation and the database first check come from your round 4 answers and from the studio's history: the shell has always had to render when the database is missing (spec 0003). Plain Tailwind bars instead of a chart library follow the same reasoning: three bars with legends need no dependency, and the legend doubles as the accessible text.

## AC-10 revision: database outage before the guard (2026-10-22)

**Context.** `/check verify` (see `docs/reviews/0012-studio-home-dashboard-verify.md`) found that with the database unreachable, or with no studio tables, a signed in request to `/studio` returns a bare 500 instead of the red `Database not reachable` card. The cause is order, not a page bug: `(signed-in)/layout.tsx` calls `requireStudioAccess()`, which calls `getStudioSession()`, whose `sessions` select throws (`src/studio/auth/session.ts:50`) before the page reaches `getDatabaseStatus()`. This was already true at `HEAD`, before feature 28. The DOM test passed only because it mocks the guard. The original AC-10 assumed the page would run during an outage, and it cannot.

The hard fact behind every option: the session lives in the database. With the database down, a real owner and a stranger with a made up cookie look the same. So any screen shown during an outage is, in effect, shown to anyone.

**Options considered.**

1. **A studio error boundary with fixed text (chosen).** Add `src/app/(studio)/studio/error.tsx` above the signed in layout. The guard stays exactly as it is.
   - Pros: no change to the guard, the most security sensitive function in the studio. Fail closed stays literal: a failed lookup still throws, and nothing renders past it. One small client file, matching the per list `error.tsx` files already in the studio. Covers every studio route at once, including login and setup, which also break during an outage. Production hides the error message from the boundary anyway (only a digest reaches it), so a leak would need a deliberate mistake.
   - Cons: you can't tell `not reachable` from `not migrated` on screen; you read the log.
2. **A guard that tells a database failure apart from a missing session.** Catch the lookup error in `requireStudioAccess()` and throw a typed outage error, or render a dedicated outage view.
   - Pros: could name the failure.
   - Cons: naming it means showing it to anyone holding any cookie, since nobody can be verified. Once you agree the screen must be generic, the typed error buys nothing over option 1, and it adds a `try` in the guard, right where the studio rules warn that `redirect()` and `notFound()` must never be caught. More risk for no visible gain.
3. **Redirect to a public health page** (for example `/studio/unavailable`) on a failed lookup.
   - Pros: a clean URL to bookmark.
   - Cons: a new ungated route that still can't show details, a redirect that turns an error into a 307 then a 200 page that looks healthy to monitoring, and a second thing the leak check and proxy must know about.
4. **Amend AC-10 to accept the error page as it is.**
   - Pros: zero code.
   - Cons: the default Next 500 page is unbranded, has no retry, and drops out of the studio's look. It accepts the symptom the verify run flagged. Option 1 is a few lines more and gives you a real screen.

**Rationale.** Option 1 keeps AC-1 and spec 0005's fail closed rule untouched and still gives you a calm, branded screen with a working retry. The red database card in the page stays for the narrow case where the guard passes and the status check then fails (a drop between reads, or a missing journal), and storage failures keep their card. The cost, reading the log to see which database failure it is, is small for a one person studio, and it is the only honest choice once you accept that an outage hides who is asking.

**Basis.** Next 16 `error.js` docs in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`: a boundary does not wrap the layout of its own segment, and Server Component errors reach it as a generic message with a digest.

## Design research

Run on 2026-10-22, because you asked whether a UI reference library would help before choosing a design source.

- **Mobbin**: Pro includes MCP, $10 a month billed yearly or $45 a quarter; REST API only on Team. No official Claude Code setup guide found.
- **Refero**: MCP on paid plans (Pro, Team, Lifetime), 8,000 MCP calls a month on Pro, an official Claude Code setup (`claude mcp add --transport http refero https://api.refero.design/mcp`). Price not stated in its docs.
- **NicelyDone**: SaaS screens only; MCP needs the Studio plan, $39 a month yearly.
- **Page Flows**: video journeys, no MCP. **InspoAI**: open source, self hosted MCP.

Outcome: Refero research mode on the free plan returned 1,000 matching web app screens for the brief, enough to pick references (Aboard, Linear, Wrike) without paying. Pro stays optional (see Follow-up in [index.md](index.md)).

## References

**Links**:
- Refero MCP getting started: https://doc.refero.design/mcp/getting-started.md
- Mobbin pricing: https://mobbin.com/pricing.md
