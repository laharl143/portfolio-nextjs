# 0006. Client tracking: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md` and can skip this file.

## Context

The studio now has a gate (spec 0005) and a data model with its rules enforced in the database (spec 0004), but nothing you can use day to day. Client tracking is the first slice that turns it into a working tool: the walking skeleton every later studio feature (contracts, the systems map, later CRM and Invoicing) will copy for its pages, forms, and error handling. Whatever pattern lands here gets repeated, so it has to be simple and hard to get wrong.

The forces: a single owner on one workspace, tens to a few hundred clients, used from a laptop and sometimes a phone. Contact email and phone are personal data under the Philippine Data Privacy Act. The stack is fixed (Next 16 App Router, React 19, Drizzle over Neon, the gated `/studio`), studio code must never reach the public bundle (the leak check), and every page and server action must guard itself because the proxy alone is not a gate. Two tabs or two devices editing the same record is realistic even for one person.

Spec 0004 left two open questions for this feature: how the list paginates and searches, and whether client and project status changes need rules. Leaving them open means each screen invents its own answer.

## Options considered

### Option 1: Server rendered pages with server actions, one route per form

Server components read through the data layer; plain forms post to server actions; each create and edit form has its own route; search and paging live in the URL.

**Pros**:
- Smallest moving parts: no client data cache, no API routes, works without JavaScript for reads and most writes.
- Every request passes through a page or action that guards itself, which matches the studio rule exactly.
- URLs can be bookmarked and survive reloads.

**Cons**:
- More route files, and a full page change for each edit.
- Feels less like an app than inline editing.

### Option 2: Master and detail on one page with client state

A client component holds the list and the selected client, fetching through server actions or route handlers.

**Pros**:
- Fast feeling navigation between clients.

**Cons**:
- Needs client side state and cache invalidation, which is where stale data bugs live.
- Poor on a phone, and harder to bookmark one client.

### Option 3: List with modal dialogs for every form

Everything is edited in dialogs over the list and detail pages.

**Pros**:
- Fewer routes.

**Cons**:
- Long forms (projects, notes) are cramped in dialogs, focus handling gets harder, and errors with kept values need more client code.

## Rationale

Option 1 fits the forces best: a single owner at small volume gains nothing from a client cache, and the security rule (every page and action guards itself) is easiest to keep when each surface is a plain server page or action. It also gives contracts and the systems map a pattern they can copy without new infrastructure. Its real cost is more files and a page load per edit, which is cheap for one person.

Smaller calls, each the recommended pick (you asked for the recommended option throughout this run):
- **Search**: name substring plus status filter, in the URL, with no new index. A trigram index is a measured follow up, not day one work (runner up: also search contacts, deferred).
- **Paging**: offset paging at 50 per page with a total count. At this volume, keyset paging adds complexity for no gain (runner up: no paging, which breaks once the list grows).
- **Status rules**: free moves for clients and projects. There is no history to protect, and a past client can come back; contracts keep their strict lifecycle (runner up: forward only with a history table, more ceremony than value now).
- **Archive**: confirmation dialog, hidden by default, an `archived=1` toggle, read only archived pages, no unarchive, matching spec 0004 (runner up: hidden for good, which loses sight of history).
- **Validation**: plain parsing functions in the data layer that collect field errors, no library. This matches spec 0004's existing style (trim, then throw coded errors) and adds no dependency (runner up: zod, which is fine but a new tool for a handful of fields).
- **Concurrent edits**: a version check on `updated_at`, read as text so its microsecond precision survives the trip through the browser (runner up: last write wins, which silently loses an edit made in another tab).
- **Primary contact**: clear then set in one transaction under the client row lock, so the unique index never trips and the move is atomic.
- **Notes**: client notes only, newest first, capped at 100 on the page, hard delete with a confirmation, plain text rendering (runner up: notes on contacts and projects too, deferred).
- **Time zone**: a code constant `Asia/Manila`. One owner in the Philippines; a per user setting would be invented need (runner up: browser time zone, which needs client rendering and causes hydration mismatches).
- **Last activity**: the list date is the latest change across the client and its children, computed at read time, because a client you just wrote a note on should not look untouched (runner up: the client row's own `updated_at` relabelled "Details changed").
- **List totals**: a plain `count(*)` query beside the page query, kept over `count(*) over()` in one query; at this volume the extra round trip costs nothing and the code is easier to read.
- **Archived children**: writes refused with `ClientArchived` under the client row lock, so a race with archiving cannot slip a new contact in.

## Cross check (2026-10-19)

A read only pass on a second model raised 12 points; 11 were applied as recommended: unwrapping Drizzle 0.45's `DrizzleQueryError` before translating unique violations, one client row lock helper for every child write, matching child ids against the client in the URL, a defined result for archived children and for not found in pages, date, page, website, and list value validity rules, a list states table, last activity instead of the client's own `updated_at`, the deliberate version bump on the old primary contact, the Next 16 control flow and Promise params rules, fixed date formats, and keeping action state out of logs. The 12th (fold the count into one query) was declined, as noted above.
