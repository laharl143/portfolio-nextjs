# 0008. Private systems map: studio screens over the spec 0004 tables, a paste in import, and a generated public file you commit

**Date**: 2026-10-19
**Status**: In Progress

## Summary

Your SMB Systems Map moves out of the Claude artifact and into the studio. There you can see every system on a board by status, open one to read and edit its public and private fields, its links, its resources (repo and docs links), and a notes log. You bring the real map in once by pasting a JSON export of the artifact into a signed in import page. Nothing private ever goes into this public repo. The public Products page stays a static file: the studio generates `products-data.ts` from the database using a fixed list of allowed fields, warns you when the bundled copy is out of date, and you commit the new file yourself.

## Requirements

**User stories**:
- As Ed, I want my whole systems map (private notes, lessons, stack, repo links) in the studio, so that I can retire the Claude artifact and track everything in one place.
- As Ed, I want the public Products page to follow the studio without ever showing a private field, so that I update a system once and the public page can catch up safely.

**Acceptance criteria** (the contract):
- **AC-1**: Signed in, `/studio/systems` shows every live system on a board with four columns in the order Built, In progress, Up next, Planned. Each card shows the name, the layer label, a `Not published` tag when `published` is off, and the number of links (sends to plus receives from, including links to archived systems). Within a column, cards sort by `sort_order`, then id (the same order the export uses). An `Archived` toggle (`?archived=1`) shows archived systems instead, in the same four columns, without the sync banner, and with "No archived systems" when there are none. A `Systems` link sits in the studio nav after `Templates`. With no systems at all, the board shows "No systems yet" with links to Import and New system.
- **AC-2**: `/studio/systems/[systemId]` shows one system in two labeled parts. **Public** (what the export may publish): published (on or off), name, status, layer, public summary, standalone (derived from layer), sort order. **Private, studio only**: summary, lessons, stack (as chips), resources (kind, label, link opening in a new tab with `rel="noopener noreferrer"`), and the notes log, newest first. It also lists connections as "Sends to" and "Receives from", each with the other system's name (a link to its page), the label, Live or Planned, and an `Archived` tag when the other end is archived (the list length always equals the card's link count). An unknown or other workspace id shows the studio not found page.
- **AC-3**: You can create a system (slug, name, status, layer, published, public summary, summary, lessons, stack, sort order) and edit every field except the slug. `published` defaults to off on create, so a new system never reaches the export until you switch it on. The slug must match `^[a-z0-9-]{1,40}$` and be unused; a taken slug shows a field error. Stack is typed one item per line and stored as a list (blank lines dropped, each item trimmed). Length limits, enforced by one shared parser that the forms and the import both use: name 80, public summary 600, summary, lessons, and note body 5000, link and resource label 120, URL 2048, stack at most 30 items of 60 characters, sort order an integer from -9999 to 9999. `standalone` is never set by hand: it is true exactly when layer is `standalone`. Edits are versioned; a stale version shows "This system changed since you opened it" and saves nothing.
- **AC-4**: You can archive a system and restore it. An archived system is read only (no edit, no link, resource, or note writes, and the import skips it), its page says it is archived, and it and the links touching it are left out of the export and the drift check. Restore makes it live again with its links intact.
- **AC-5**: From a system's page you can add a link it sends (to another live system, a label, Live or Planned), edit a link's label and state, and delete a link after a confirm (delete matches the link id, the system, and the workspace; a link already gone counts as done). A link to itself or a second link between the same two systems in the same direction is refused with a field error. Any link write where either end is archived is refused with "Restore the archived system first".
- **AC-6**: You can add, edit, and delete resources on a system (kind `repo`, `live`, `docs`, `board`, or `other`, a label, and an `http://` or `https://` URL), and add, edit, and delete notes on it (deletes work like link deletes). A URL must parse with `new URL()`, use `http:` or `https:`, and have a host. Resources and notes never appear outside the studio.
- **AC-7**: `/studio/systems/import` takes pasted JSON in the artifact's shape (`{ "systems": [...], "links": [...] }`, up to 256 KB measured as UTF-8 bytes). Every system row must carry `id`, the slug (the artifact's document id, which is the public `ProductId`), matching `^[a-z0-9-]{1,40}$`; link `from` and `to` hold those ids. Unknown keys (such as `updatedAt`) are ignored. A missing or invalid `id`, a duplicate `id`, a duplicate from and to pair, and a self link are row errors. **Preview** checks every row and lists each system and link as Create, Update (naming the fields that change, and tagging a change to a public field, meaning name, status, layer, sort order, or a link label or state, as `Public`), Unchanged, Skipped (archived), or an error with its path (for example `systems[3].status: unknown status "done"`). **Import** stays disabled until the preview is free of errors. On submit it parses and plans the posted JSON again inside one transaction (it never trusts the preview's plan), refuses if any error appears, applies the whole plan, and shows created, updated, unchanged, and skipped counts for systems, links, notes, and resources. It matches systems by slug and links by from and to, never deletes anything, and running the same JSON again reports everything Unchanged and writes nothing.
- **AC-8**: The import maps the artifact fields as the Value sourcing table states: statuses `ongoing` to `in-progress` and `idea` to `planned`; `group` to layer; `order` to sort order; `summary`, `lesson`, and `stack` to the private fields; a non empty `notes` to one note on that system (skipped when a note with the same text already exists there); `repo` to one `repo` resource (skipped when that URL is already a resource). Link `state` must be `live` or `planned` (anything else is a row error). A new system's public summary comes from the row's optional `publicSummary`, else from the bundled `products-data.ts` entry with the same id; with neither, that row is an error. A new system is `published` when the bundled file has its id, otherwise off. On update, the public summary changes only when `publicSummary` is given, and `published` never changes. A row matching an archived system is Skipped (archived): nothing is written for it, including its note and resource.
- **AC-9**: The systems board shows a sync banner comparing the database with the bundled `utils/data/products-data.ts`: "Public page matches the studio", or "Public page is out of date: N differences" with a list and an **Export public file** button. Both sides are reduced to one shape (published live systems with `id`, `name`, `status`, `summary`, `standalone`; links whose two ends are both in that set) and compared exactly, with no trimming. One difference is counted per system added, per system removed, per changed field (name, status, summary, standalone), per link added or removed, per link whose label or state changed, and one "order changed in <section>" per status section whose sequence of shared ids differs.
- **AC-10**: **Export public file** (`GET /studio/systems/export`) downloads `products-data.ts`, built only from published live systems and links whose two ends are both, using only `id`, `name`, `status`, `public_summary` (as `summary`), `standalone` (written only when true), and the link `from`, `to`, `label`, `state`. The file keeps the current types, `statusSections`, header comment (plus one line saying it is generated by the studio export), and the literal layout of today's `products` and `productLinks` (LF line endings, a final newline). The button is a plain `<a href download>`, never a `next/link` (which would prefetch the route). Dropped into the repo, the file passes `npm run lint` and `npm run build` with no edits, and after the deploy the banner reads "matches". With no exportable systems, the button is disabled with a message and the route answers 409 as a backstop, so the public page is never emptied by accident.
- **AC-11**: `/products` still reads only `utils/data/products-data.ts`; no public file imports studio code; `npm run build` ends with `[leak-check] clean`; no private field value (summary, lessons, stack, resource, note) appears in the generated file or the public bundle.
- **AC-12**: Signed out, every systems page, the import action, and the export route are unreachable (redirect to login for pages, the same guard for actions and the route). The pages have loading, error, and not found states, work at 375px width (the board stacks to one column), and read well in light and dark themes. Logs from these actions carry only the action name and the error code, never pasted JSON, notes, or field values.

## Decision

**Chosen option**: Option 1: Studio generated public file that you commit (plus a paste in import and screens over the existing tables).

The studio becomes the single source for the systems map; the public page keeps reading a static, committed `products-data.ts` that the studio generates from an allowlist (a fixed list of permitted fields), and a drift banner tells you when to regenerate it.

**Implementation skills**: `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) · `neon-postgres` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn-ui` (`jezweb/claude-skills`, `.claude/skills/shadcn-ui/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.claude/skills/tailwindcss-advanced-layouts/`)

**Decided for you on 2026-10-19** (you asked for the recommended pick on every remaining choice, including the cross check fixes; each is open to change at review):
- Public sync: studio export plus drift banner, you commit. Runner up: a local export script (needs the production URL on your machine).
- Import: signed in paste page with preview. Runner up: typing the 15 systems by hand.
- Artifact notes: first entry in the notes log. Runner up: a new notes column.
- Layers: a private `layer` column, `standalone` derived from it. Runner up: status only.
- No drawn map diagram in this feature; the board plus the connections list replace the artifact as a tracker, and the diagram goes to Deferred. Runner up: an SVG map like the artifact's (most of the UI effort for little tracking value).
- A `published` flag gates whole rows: off by default for new systems, on for the 15 existing ones, so a private idea created in the studio never reaches the export by accident. Runner up: rely on reading the git diff.
- The import may change public fields (name, status, layer, sort order, link labels and states), because the artifact is your tracker, but the preview tags each such change `Public`. Only the public summary and `published` are protected. Runner up: never let the import touch public fields after create.
- Archived systems can be restored (the artifact had no archive, and a wrong archive would silently drop a product from the next export). Runner up: no restore, as in spec 0004.
- Link writes require both ends live. Runner up: allow edits on links to archived systems (more rules for no real use).
- The import overwrites matching fields (last write wins, no version check). Runner up: versioned import (a one time tool does not need it).
- Export ordering: systems by `sort_order`, then id; links by the from system's `sort_order`, then the to system's `sort_order`, then label. This is stable whatever order rows were created in; the first export may reorder `productLinks` once.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (spec 0004 tables; one additive change):

| Table | Change in this feature |
|---|---|
| `systems` | **Add** `layer text not null default 'core'`, check `systems_layer_check` in (`current`, `platform`, `core`, `layer2`, `standalone`). Backfill `layer = 'standalone' where standalone`. **Add** check `systems_standalone_matches_layer`: `standalone = (layer = 'standalone')`. **Add** `published boolean not null default false`, backfilled to `true` for every existing row (all of them come from the public file today). Everything else unchanged: `id` slug PK, `name`, `status`, `public_summary`, private `summary`, `lessons`, `stack text[]`, `sort_order`, `archived_at`. |
| `system_links` | Unchanged. Directed `from_system_id` → `to_system_id`, `label`, `state` (`live`, `planned`), unique (from, to), no self link, hard delete. |
| `system_resources` | Unchanged. `system_id`, `kind`, `label`, `url` (http or https), hard delete, never public. |
| `notes` | Unchanged. System notes use `system_id` (exactly one target per note). |

`SYSTEM_LAYERS` joins `src/studio/db/constants.ts` (as const, with the union type) and labels live with it in the studio: `current` "Shipped and in progress", `platform` "Shared platform", `core` "Core SMB apps", `layer2` "Layer 2 apps", `standalone` "Standalone". The migration is `drizzle/0008_*`: add both columns with their defaults, backfill, then add both checks, in one generated plus hand edited migration (forward only and additive, safe in the unattended Vercel build). The seed (`scripts/seed-studio.ts`) must now write `layer` (`standalone` for the standalone product, else `core`), or the new check rejects it, and `published: true` (its systems come from the public file). Seeded layers are therefore mostly `core` until you import the real map.

Relationships stay as spec 0004: system N:M system through `system_links` (directed), system 1:N resources, system 1:N notes, workspace 1:N each.

**State transitions**: system: live ⇄ archived (archive sets `archived_at`, restore clears it). Status (`built`, `in-progress`, `next`, `planned`) is a free choice with no transition rules.

**API surface** (pages are server rendered; writes are server actions taking `(prev: ActionState, formData)`; every one calls `requireStudioAccess()` first):

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/studio/systems` | page | `?archived=1` | board, sync banner | owner session | database error → `error.tsx` |
| `/studio/systems/new` | page + `createSystem` | slug, name, status, layer, published, publicSummary (req), summary, lessons, stack, sortOrder | redirect to detail | owner session | slug taken or invalid, blank name or public summary → field errors |
| `/studio/systems/[systemId]` | page | `systemId`, `?notesPage=` | detail, connections, resources, notes (50 per page) | owner session | `NotFound` |
| `/studio/systems/[systemId]/edit` | page + `updateSystem` | every field but slug, `version` | redirect to detail | owner session | `StaleRecord`, `SystemArchived`, field errors |
| detail page buttons | `archiveSystem`, `restoreSystem` | `systemId` | redirect to detail | owner session | `NotFound`; archiving an archived row (or restoring a live one) returns it unchanged |
| `/studio/systems/[systemId]/links/new` | page + `createSystemLink` | toSystemId, label, state | redirect to detail | owner session | `SelfLink`, `DuplicateLink`, `SystemArchived`, `NotFound` |
| `/studio/systems/[systemId]/links/[linkId]/edit` | page + `updateSystemLink`, `deleteSystemLink` | label, state, `version` | redirect to detail | owner session | `StaleRecord`, `SystemArchived`, `NotFound` |
| `/studio/systems/[systemId]/resources/new`, `resources/[resourceId]/edit` | pages + `createSystemResource`, `updateSystemResource`, `deleteSystemResource` | kind, label, url, `version` on edit | redirect to detail | owner session | invalid URL, `StaleRecord`, `SystemArchived`, `NotFound` |
| `/studio/systems/[systemId]/notes/new`, `notes/[noteId]/edit` | pages + `createSystemNote`, `updateSystemNote`, `deleteSystemNote` | body, `version` on edit | redirect to detail | owner session | blank body, `StaleRecord`, `SystemArchived`, `NotFound` |
| `/studio/systems/import` | page + `previewSystemsImport`, `applySystemsImport` | `json` (textarea, ≤ 256 KB as UTF-8 bytes) | an import state extending `ActionState` with a typed `plan` (rows) and, after apply, `counts`; the JSON stays in `values` so the textarea survives | owner session | `InvalidInput` (too large, not JSON, row errors with paths), `ImportHasErrors` on apply |
| `/studio/systems/export` | route handler `GET` | none | `products-data.ts` as `text/plain; charset=utf-8`, `Content-Disposition: attachment; filename="products-data.ts"`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` | owner session (redirect to login otherwise) | `NothingToExport` → 409 with a short text message |

Code layout: `src/studio/data/systems.ts` (reads, writes, `lockLiveSystem(tx, id)`), `system-links.ts`, `system-resources.ts`, system note functions added to `notes.ts`; `src/studio/systems/actions.ts`; `src/studio/systems/import.ts` (parse and plan, pure apart from the reads it is handed); `src/studio/systems/export.ts` (`buildPublicProductsFile(projection)`, pure string building); `src/studio/systems/drift.ts` (`diffPublic(dbProjection, bundled)`, pure); `src/studio/systems/projection.ts` (`getPublicProjection()`, the one query that selects only public columns). Pages under `src/app/(studio)/studio/(signed-in)/systems/`, reusing `Field.tsx`, `FormMessage.tsx`, `FormPage.tsx`, `ConfirmSubmit.tsx`, and `ui.ts` from client tracking.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Board | columns and titles | `statusSections` from `utils/data/products-data.ts` (studio may import public data; the seed already does) |
| Board | card layer label | `systems.layer` mapped through the `SYSTEM_LAYERS` labels |
| Board | link count | `count(*)` of `system_links` where from or to is the system (any state, either end archived or not) |
| Board | `Not published` tag | `systems.published` |
| Board, detail | workspace scope | `getWorkspaceId()` from the session (spec 0005) |
| Detail | standalone shown | `systems.standalone` (kept equal to `layer = 'standalone'` by the check) |
| Detail | connection names and status | joined `systems.name`, `archived_at` of the other end |
| Detail, notes | times | `formatDateTime` in `STUDIO_TIME_ZONE` (`Asia/Manila`) from `src/studio/format.ts` |
| Create system | `id` | slug input (immutable afterwards) |
| Create, edit | `standalone` | derived in the data layer: `layer === "standalone"` |
| Create, edit | `stack` | textarea split on new lines, trimmed, blanks dropped |
| Any child insert | `workspace_id` | the locked parent system row |
| Edit | `version` | `updated_at::text` read with the form |
| Import | statuses | `built` and `next` as is; `ongoing` → `in-progress`; `idea` → `planned`; the schema values are also accepted as is; anything else is a row error |
| Import | layer | artifact `group` (same five values); missing or unknown is a row error |
| Import | system key | row `id` (the artifact document id); required |
| Import | sort order | artifact `order` (integer, imported as is), default 0 when missing |
| Import | `published` on create | true when the bundled `products` has the id, else false; never changed on update |
| Import | link state | artifact `state`, `live` or `planned` only |
| Import | counts | per entity (systems, links, notes, resources): created, updated, unchanged, skipped |
| Import | private summary, lessons | artifact `summary`, `lesson` (trimmed, blank → null) |
| Import | stack | artifact `stack` string split on `·`, trimmed, blanks dropped; missing → empty list |
| Import | note | artifact `notes` when non empty after trim, unless a note with the same trimmed body exists on that system |
| Import | repo resource | artifact `repo` → kind `repo`, label `Repository`, unless that URL is already a resource of that system |
| Import | public summary on create | row `publicSummary`, else bundled `products` entry with the same id, else row error `publicSummary required` |
| Import | name | artifact `name` |
| Import | link fields | artifact `from`, `to`, `label`, `state`; an end not in the JSON and not in the database is a row error; a link touching an archived system is listed as skipped |
| Drift banner | the bundled side | `products` and `productLinks` imported from `utils/data/products-data.ts` (the copy built into this deploy) |
| Drift banner, export | the database side | `getPublicProjection()`: published live systems' `id`, `name`, `status`, `public_summary`, `standalone`, `sort_order`, and links whose two ends are both in that set |
| Drift, export | how studio code reaches the bundled file | a relative import of `utils/data/products-data` (as the seed does), since `@/*` maps only to `src/*` |
| Export | file text | `buildPublicProductsFile()`: fixed header (the current comments plus "Generated by the studio export (spec 0008). Edit systems in the studio, then export again."), the `ProductId` union from the exported ids, the existing `ProductStatus`, `PublicProduct`, `ProductLink` types and `statusSections` written literally, strings escaped with `JSON.stringify`, two space indentation matching today's file |
| Export | order | systems by `sort_order`, then id; links by from `sort_order`, to `sort_order`, label |

**Key invariants**:
- The public file is built only by `buildPublicProductsFile()` from `getPublicProjection()`, which never selects a private column. A private field cannot reach the export by accident, because it is never read.
- `standalone = (layer = 'standalone')` always (database check).
- A system's slug never changes after create (it is the public `ProductId` and the key links point at).
- The import never deletes rows, never changes `archived_at` or `published`, never writes to an archived system, and always plans again inside its own transaction; all or nothing.
- Forms and the import share one input parser, so the import cannot write a value the edit form would reject.
- Only published live systems are exported.
- Archived systems are read only, and nothing touching them is exported.
- Every edit is versioned on `updated_at`, as the studio rules require.
- Link writes lock both ends with `lockLiveSystem()` in sorted id order (no deadlock), then the link.

**Security model**: One owner, one workspace (specs 0004 and 0005). Every page, action, and the export route calls `requireStudioAccess()` before any read. Private fields, resources, and notes are studio only and are never logged. This repo is public, so the real map never enters git: it comes in through the signed in import page, and the JSON you paste lives only in your browser and the database. The only systems data that ever leaves the studio is the generated file, which you read in the git diff before you commit it (the human check that spec 0002 asked for). Resource URLs render only in studio pages and open with `noopener noreferrer`. No compliance scope: systems data holds no personal data (keep client names out of notes, as spec 0002 asks for the public text).

**Configuration required**: none. No new environment variables or services.

**Critical test scenarios**:
- Happy path: on the dev branch, paste the artifact JSON → Preview shows 15 systems (Update, since the seed created them) and 21 links → Import → the board shows them by status with layers; open RoomPOS and see the lessons, stack chips, repo resource, and the imported note, verifies **AC-1**, **AC-2**, **AC-7**, **AC-8**
- Rerun: paste the same JSON again → everything Unchanged, Import writes nothing, verifies **AC-7**, **AC-8**
- Sync: change OMS's status → banner shows 1 difference → Export → replace the file → lint and build pass → banner reads "matches", verifies **AC-9**, **AC-10**
- Privacy: search the generated file and `.next` output for a lesson's text and the repo URL → no match; leak check clean, verifies **AC-10**, **AC-11**
- Bad input: JSON with `status: "done"`, a row with no `id`, two rows with the same `id`, and a link to `ghost` → each listed with its path, Import disabled; a 300 KB paste is refused, verifies **AC-7**
- Archived on import: archive Ledger, paste the JSON → Ledger shows Skipped (archived) and gains no note, its links are skipped, verifies **AC-4**, **AC-8**
- Unpublished: create `test-idea` with published off → the board tags it, the banner still matches, the export leaves it out; switch it on → 1 difference, verifies **AC-3**, **AC-9**, **AC-10**
- Rules: create slug `oms` (taken), a self link, a duplicate link, a link to an archived system, an edit from a stale tab → each refused with its message, verifies **AC-3**, **AC-4**, **AC-5**
- Archive: archive Helpdesk → board hides it, export drops it and its 3 links, restore brings them back, verifies **AC-4**, **AC-10**
- Signed out: open `/studio/systems`, POST an import action, GET `/studio/systems/export` → login redirect or refusal, no data, verifies **AC-12**
- Empty: on an empty migrated branch the board shows "No systems yet" and export refuses, verifies **AC-1**, **AC-10**

## Build plan

Tracer Bullet: the first slice runs one thread through every layer (migration, read, export, the public file) before the screens fill in.

1. **Thin thread**: the `layer` migration and constants, the seed writing `layer`, the `Systems` nav link, the board reading live systems, a read only detail page, `getPublicProjection()`, `diffPublic()` with the banner, and the export route with `buildPublicProductsFile()`. Prove it on the dev branch: export straight after the seed gives a file that matches today's `products-data.ts` apart from the generated header line and link order, and passes lint and build (seeded layers read mostly `core` until step 2 imports the real map). Satisfies **AC-1**, **AC-2**, **AC-9**, **AC-10**, **AC-11**
2. **Import**: the import page, the parser and planner with the field mapping, preview with row errors, the one transaction apply, the rerun Unchanged check. Build the JSON from the artifact's database (each document's id written into its row as `id`; Claude can read it with the artifact data tool) and run it on the dev branch, with the file saved outside the repo (for example in your scratch folder; never commit it). Satisfies **AC-7**, **AC-8**
3. **Edit everything**: create and edit system (versioned, slug rules, stack lines, derived standalone), archive and restore, links (add, edit, delete, both ends locked), resources, and system notes with paging. Satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**
4. **Hardening and the real move**: loading, error, and not found states, error paths and log hygiene, 375px and both themes, lint, build, leak check. Then in production: import the real map, export, check the diff by eye, commit `products-data.ts`, deploy, confirm the banner reads "matches" and `/products` is right. Satisfies **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:
- One place for the map, with real history (the notes log) and real links to repos and docs.
- The public page keeps every strength of spec 0002: static, fast, no database, private fields physically absent.
- Drift is visible instead of silent, and the export is the only door out, built from a query that never reads a private column.

**Negative / tradeoffs**:
- Publishing is two steps: export in the studio, then commit and deploy. A status change is not public until you do both.
- Production has the real map and the dev branch has whatever you import there; the two can differ, and the banner on each deploy compares against that deploy's bundled file.
- Rerunning an old import after you edit or delete an imported note adds that note again (the duplicate check compares text only). Accepted: the import is a one time move, and a marker column is not worth it.
- The import overwrites matching fields with no version check. If you edit a system in the studio and later paste an older artifact export, the old values win for that system (the preview names every field it will change, so read it first).
- `systems.id` stays a global slug (spec 0004's accepted limit), and it can never be renamed here.
- A new system the public page should show needs a public summary written for the public by you; the studio does not write one.

**Neutral**:
- One additive migration (`layer` and two checks); the seed changes to write `layer`.
- The generated file replaces a hand edited one; the root `AGENTS.md` rule about `products-data.ts` gains "generated by the studio export" (a `/sync` job).
- After the production import, the Claude artifact can be retired by hand (left read only or deleted, your call).

## Follow-up

- [ ] Once built: `/sync` adds the systems conventions to `src/studio/AGENTS.md` and notes in root `AGENTS.md` that `products-data.ts` is generated by `/studio/systems/export`.
- [ ] After the production import is verified, retire the SMB Systems Map artifact (outside the repo).
- [ ] Deferred: a drawn systems map diagram in the studio (the artifact's SVG view).
- [ ] Deferred: an export that opens a pull request for you (GitHub API) instead of a download, if the two step publish gets tedious.
