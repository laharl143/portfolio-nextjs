# 0006. Client tracking: server rendered list and detail pages over the spec 0004 tables

**Date**: 2026-10-19
**Status**: Accepted

## Summary

This is the first real screen set in your private studio. You get a client list you can search by name and filter by status, plus a page for each client that shows its contacts, projects, and notes, with forms to add and edit each one. Everything is rendered on the server and changed through server actions (functions the browser form posts to, which run only on the server). Every page and action checks your session first, and every query is scoped to your workspace. No schema change is needed: the tables and their rules shipped with spec 0004. Archived records drop out of view but are never deleted, and a "show archived" toggle lets you look them up read only.

## Requirements

**User stories**:
- As Ed, I want one place to list and find my clients, so that I stop tracking them across notes apps and chats.
- As Ed, I want each client's contacts, projects, status, and notes on one page, so that I can pick up a relationship where I left it.
- As Ed, I want archived clients out of my way but still findable, so that the list stays about current work without losing history.

**Acceptance criteria** (the contract):
- **AC-1**: Signed out, every page under `/studio/clients` redirects to `/studio/login?next=<that path>`, and every client tracking server action called without a valid session redirects the same way and changes nothing (each page and action calls `requireStudioAccess()` itself; the proxy is never the only gate).
- **AC-2**: `/studio/clients` lists the workspace's clients that are not archived, sorted by name ignoring case (then by `id`), 50 per page, showing for each: name (a link to its detail page), status, industry, primary contact name, and last activity date (the latest change to the client or to any of its contacts, projects, or notes). Previous and next links appear only when that page exists. The studio header gains a `Clients` link between `Studio` and `Security`.
- **AC-3**: The list takes `q` (name contains, ignoring case; `%`, `_`, and `\` match literally; trimmed; cut to its first 100 characters) and `status` (`lead`, `active`, or `past`; any other value is ignored) from the URL, so a search survives a reload and can be bookmarked. Both combine, and the `archived=1` toggle combines with them too. Every filter control keeps the other filters and drops `page`; the paging links keep all filters. The list states follow the **List states** table in the feature design: no clients at all, no match, past the last page, and no archived clients each have their own message.
- **AC-4**: `/studio/clients/new` creates a client with name (required, at most 200 characters), status (default `lead`), website (optional; `https://` is added when no scheme is typed; it must then parse as an `http` or `https` URL whose host contains a dot), and industry (optional, at most 100 characters). A name that matches another client that is not archived, ignoring case, shows a field error on name and saves nothing. On success you land on the new client's detail page.
- **AC-5**: `/studio/clients/[clientId]/edit` edits the same fields. Status moves freely among `lead`, `active`, and `past`. If the client changed after the form was opened (its version no longer matches), the form shows "This client changed since you opened it." with a `Reload` link to the same edit page, keeps what you typed, and saves nothing. The duplicate name rule from AC-4 applies.
- **AC-6**: Archiving a client asks for confirmation in a dialog. A client with a `signed` or `active` contract that is not archived is refused with "This client has a signed or active contract, so it cannot be archived yet." On success you return to the list, where the client no longer shows. `/studio/clients?archived=1` lists only archived clients (same search, filter, sort, and paging). An archived client's detail page shows "Archived on <date>" and no edit, add, archive, or delete controls; every write action on it or on its contacts, projects, or notes is refused with `ClientArchived` and changes nothing. Edit and add pages for an archived client redirect to its detail page. There is no unarchive.
- **AC-7**: On a client that is not archived you can add, edit, and archive contacts: full name (required, at most 200), email (optional, at most 320, a simple `name@host.tld` shape), phone (optional, at most 50, free text), preferred channel (optional: email, phone, Viber, WhatsApp, other), and primary (yes or no). An email already used by another live contact of the same client, ignoring case, is a field error. Marking a contact primary clears the previous primary in the same transaction, so a client never shows two. The add form starts with primary ticked when the client has no live primary contact. Archiving a contact asks for confirmation; archived contacts no longer show on the client page, and archiving the primary leaves the client with none.
- **AC-8**: On a client that is not archived you can add, edit, and archive projects: name (required, at most 200), status (`planned` by default; free moves among planned, active, on hold, done, cancelled), description (optional, at most 5,000), start date, target end date, and actual end date (all optional). A target or actual end date before the start date, or an actual end date while the status is not done or cancelled, is a field error (never a silent clear). The version check from AC-5 applies. Archiving a project asks for confirmation and is refused with "This project has a signed or active contract." while one exists; archived projects no longer show on the client page.
- **AC-9**: On a client that is not archived you can add a note from a box on the detail page (plain text, required, at most 10,000 characters), edit it on its own page (with the version check), and delete it after a confirmation dialog (notes are hard deleted, per spec 0004). Notes show newest first, at most the latest 100 (with "Showing the latest 100 notes" when there are more), each with its creation time in Asia/Manila time and an "edited" marker when it was changed after creation. Note text renders as plain text with its line breaks kept, never as HTML or Markdown.
- **AC-10**: Every state renders: each section of the detail page (contacts, projects, notes) has its own empty state; list and detail pages show a loading skeleton; a failed read shows an error panel with a `Try again` button; an unknown client, contact, project, or note id, a malformed id, an id from another workspace, a child id that belongs to a different client than the one in the URL, or an archived contact or project shows the studio not found page (never a 500). A failed action shows an inline message, keeps the typed values, and moves focus to the message.
- **AC-11**: Contact email and phone never appear in logs; an unexpected action failure logs only the action name and the error `code` or class name, a duplicate key error never reaches the log as a raw Postgres message, and the action state (which echoes typed values) is never logged or printed by an error boundary. No file outside `src/studio/`, `src/app/(studio)/`, and `scripts/` imports the new code, `npm run build` still ends with `[leak-check] clean`, and this feature adds no environment variable and no migration.
- **AC-12**: Every input has a visible label, field errors are tied to their input (`aria-describedby`) and the form message uses `role="alert"`, the confirmation dialogs work by keyboard and return focus when closed, the pages work in light and dark themes, and at 375px wide nothing scrolls sideways (the list turns into stacked cards below the `sm` breakpoint).

## Decision

**Chosen option**: Option 1: Server rendered pages with server actions, one route per form

Build client tracking as server components that read through new functions in the spec 0004 data layer, with plain HTML forms posting to server actions (`useActionState` for errors and kept values), a separate route for each create and edit form, URL query parameters for search and paging, and a version check on every edit.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn-ui` (`jezweb/claude-skills`, `.claude/skills/shadcn-ui/`) · `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.claude/skills/tailwindcss-advanced-layouts/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: no change. The feature uses the spec 0004 tables as they are:

| Table | Columns this feature reads or writes | Rules already enforced by the database |
|---|---|---|
| `clients` | `name`, `status`, `website`, `industry`, `archived_at`, `updated_at` | name not blank; unique `lower(name)` per workspace among rows not archived; status in `lead`, `active`, `past` |
| `contacts` | `client_id`, `full_name`, `email`, `phone`, `preferred_channel`, `is_primary`, `archived_at`, `updated_at` | one primary per client among live rows; unique `lower(email)` per client among live rows; channel in its list |
| `projects` | `client_id`, `name`, `status`, `description`, `start_date`, `target_end_date`, `actual_end_date`, `archived_at`, `updated_at` | date order checks; actual end only when done or cancelled; status in its list |
| `notes` | `client_id` only (this feature writes client notes only), `body`, `created_at`, `updated_at` | exactly one target; body not blank |
| `contracts` | read only: `client_id`, `project_id`, `status`, `archived_at` | used for the archive refusals |

Relationships: client 1:N contacts, projects, notes. Notes on contacts, projects, contracts, and systems stay unused until later features.

Search uses `lower(name) like lower($q)` with escaped wildcards and no new index. At your volume (tens to a few hundred clients) a sequential scan over one workspace is under a millisecond; a trigram index (`pg_trgm`) is a follow up only if the list passes about 5,000 rows.

**State transitions**: client status and project status are free moves within their lists (no history table). Archive is one way: `archived_at` null → set, never back.

**Routes and files** (all under `src/app/(studio)/studio/(signed-in)/clients/`, each page calling `await requireStudioAccess()`):

| Route | File | Shows |
|---|---|---|
| `/studio/clients` | `page.tsx` | list, search form (GET), status filter, archived toggle, paging |
| `/studio/clients/new` | `new/page.tsx` | create client form |
| `/studio/clients/[clientId]` | `[clientId]/page.tsx` | client fields, archive button, contacts, projects, notes with the add note box |
| `/studio/clients/[clientId]/edit` | `[clientId]/edit/page.tsx` | edit client form |
| `/studio/clients/[clientId]/contacts/new` | `[clientId]/contacts/new/page.tsx` | add contact form |
| `/studio/clients/[clientId]/contacts/[contactId]/edit` | `[clientId]/contacts/[contactId]/edit/page.tsx` | edit contact form, archive button |
| `/studio/clients/[clientId]/projects/new` | `[clientId]/projects/new/page.tsx` | add project form |
| `/studio/clients/[clientId]/projects/[projectId]/edit` | `[clientId]/projects/[projectId]/edit/page.tsx` | edit project form, archive button |
| `/studio/clients/[clientId]/notes/[noteId]/edit` | `[clientId]/notes/[noteId]/edit/page.tsx` | edit note form |
| (segment files) | `loading.tsx`, `error.tsx` (client component with `reset`), `not-found.tsx` in `clients/` | skeleton, error panel, not found |

Shared pieces live in `src/app/(studio)/studio/_components/` (form field with label and error, status badge, `ConfirmSubmit` wrapping the shadcn `AlertDialog` around a form, the existing `PendingButton`). Add the dialog with `npx shadcn@latest add alert-dialog` into `src/components/ui/`.

**API surface** (server actions in `src/studio/clients/actions.ts`, a `"use server"` module starting with `import "server-only"` and `import "@/studio/marker"`; each one calls `await requireStudioAccess()` first, then a data function, and returns `ActionState`):

`ActionState = { ok: true } | { ok: false; code: string; message: string; fieldErrors?: Record<string, string>; values?: Record<string, string> }`. Contact email and phone are echoed back only inside `values`, never logged.

| Action | Inputs (FormData) | On success | Key errors (`code` → what the form shows) |
|---|---|---|---|
| `createClientAction` | `name` (req), `status`, `website`, `industry` | redirect to `/studio/clients/<id>` | `INVALID_INPUT` (field errors), `DUPLICATE_CLIENT_NAME` (field error on name) |
| `updateClientAction` | `clientId`, `version` (req), same fields | redirect to the detail page | `INVALID_INPUT`, `DUPLICATE_CLIENT_NAME`, `STALE_RECORD`, `CLIENT_ARCHIVED`, `CLIENT_NOT_FOUND` |
| `archiveClientAction` | `clientId` | redirect to `/studio/clients` | `CLIENT_HAS_LIVE_CONTRACTS`, `CLIENT_NOT_FOUND` |
| `createContactAction` | `clientId`, `fullName` (req), `email`, `phone`, `preferredChannel`, `isPrimary` | redirect to the detail page | `INVALID_INPUT`, `DUPLICATE_CONTACT_EMAIL`, `CLIENT_ARCHIVED`, `CLIENT_NOT_FOUND` |
| `updateContactAction` | `clientId`, `contactId`, `version`, same fields | redirect to the detail page | as above plus `STALE_RECORD`, `CONTACT_NOT_FOUND` |
| `archiveContactAction` | `clientId`, `contactId` | redirect to the detail page | `CLIENT_ARCHIVED`, `CONTACT_NOT_FOUND` |
| `createProjectAction` | `clientId`, `name` (req), `status`, `description`, `startDate`, `targetEndDate`, `actualEndDate` | redirect to the detail page | `INVALID_INPUT`, `CLIENT_ARCHIVED`, `CLIENT_NOT_FOUND` |
| `updateProjectAction` | `clientId`, `projectId`, `version`, same fields | redirect to the detail page | as above plus `STALE_RECORD`, `PROJECT_NOT_FOUND` |
| `archiveProjectAction` | `clientId`, `projectId` | redirect to the detail page | `PROJECT_HAS_LIVE_CONTRACTS`, `CLIENT_ARCHIVED`, `PROJECT_NOT_FOUND` |
| `createNoteAction` | `clientId`, `body` (req) | `revalidatePath` of the detail page, return `{ ok: true }` (the form resets) | `INVALID_INPUT`, `CLIENT_ARCHIVED`, `CLIENT_NOT_FOUND` |
| `updateNoteAction` | `clientId`, `noteId`, `version`, `body` | redirect to the detail page | `INVALID_INPUT`, `STALE_RECORD`, `CLIENT_ARCHIVED`, `NOTE_NOT_FOUND` |
| `deleteNoteAction` | `clientId`, `noteId` | `revalidatePath` of the detail page | `CLIENT_ARCHIVED`, `NOTE_NOT_FOUND` |

Any other thrown error: log `[studio] <actionName> failed` with the error's `code` or class name only, and return `{ ok: false, code: "UNEXPECTED", message: "Something went wrong. Try again." }` with the typed values.

Next 16 rules for every action and page:
- `await requireStudioAccess()` is the first line and sits before the `try`; `redirect()` and `notFound()` are also called outside the `try`, so their control flow errors are never caught.
- Page `params` and `searchParams` are Promises and are awaited.
- `revalidatePath` takes the concrete path (`/studio/clients/${clientId}`); the list needs none, because studio pages are dynamic.
- The add note form resets after `{ ok: true }` by giving the form a `key` that changes on each success (React 19 keeps uncontrolled form values when an action returns state).
- Checkboxes parse as `formData.get("isPrimary") === "on"`.
- Pages catch the data layer's `NotFound` classes (`ClientNotFound`, `ContactNotFound`, `ProjectNotFound`, `NoteNotFound`) with one helper, `notFoundOr(err)` in `src/studio/clients/page-errors.ts`, which calls `notFound()` for those and rethrows anything else to `error.tsx`.
- `clients/not-found.tsx` renders inside the signed in layout: a "Not found" heading, one line saying the record does not exist or was archived, and a link back to `/studio/clients`.
- `error.tsx` shows fixed text and a `Try again` button, never `error.message`.

**List states** (one message each, in this order of checks):

| State | When | Shows |
|---|---|---|
| No clients yet | live view, no filters, live client count 0 | "No clients yet" and `Add client` |
| No archived clients | `archived=1`, no `q` or `status`, archived count 0 | "No archived clients" and a link back to the live list |
| No match | any filter set, `total` 0 | "No clients match" and a link that keeps `archived` and clears `q` and `status` |
| Past the last page | `total` > 0 but the page has no rows | "No clients on this page" and a link to page 1 with the same filters |

The `Add client` button shows in the live view only, never with `archived=1`.

**Data layer** (`src/studio/data/`, every function filtering by `await getWorkspaceId()`, importing nothing from `next/*`):

| Function | File | Kind | Returns | Throws |
|---|---|---|---|---|
| `listClients({ q?, status?, archived, page })` | `clients.ts` | read | `{ rows: ClientRow[], total: number, page, pageSize: 50 }`; `ClientRow` = id, name, status, industry, primaryContactName, lastActivityAt | none beyond database errors |
| `getClientDetail(clientId)` | `clients.ts` | read | client with `version`, live contacts, live projects, latest 100 client notes, `noteTotal` | `ClientNotFound` |
| `getClientForEdit`, `getContactForEdit`, `getProjectForEdit`, `getNoteForEdit` | per entity file | read | the row plus `version` and the parent client's `archivedAt` | the matching `NotFound` |
| `createClient(input)` / `updateClient(id, version, input)` | `clients.ts` | write | the row | `InvalidInput`, `DuplicateClientName`, `StaleRecord`, `ClientArchived`, `ClientNotFound` |
| `archiveClient(id)` | `clients.ts` (exists) | write | the row | `ClientHasLiveContracts`, `ClientNotFound` |
| `createContact(clientId, input)` / `updateContact(id, version, input)` / `archiveContact(id)` | `contacts.ts` | write, one transaction each, client row locked first | the row | `InvalidInput`, `DuplicateContactEmail`, `StaleRecord`, `ClientArchived`, `ContactNotFound` |
| `createProject(clientId, input)` / `updateProject(id, version, input)` / `archiveProject(id)` | `projects.ts` | write; archive locks the client row, then the project row | the row | `InvalidInput`, `StaleRecord`, `ClientArchived`, `ProjectNotFound`, `ProjectHasLiveContracts` |
| `createClientNote(clientId, body)` / `updateNote(id, version, body)` / `deleteNote(id)` | `notes.ts` | write | the row (delete returns nothing) | `InvalidInput`, `StaleRecord`, `ClientArchived`, `NoteNotFound` |

Input parsing lives in `src/studio/data/input.ts` (plain functions, no library): trim every text field, turn blank optionals into `null`, check lengths, formats, and date order, and collect every problem into one `InvalidInput` whose `fieldErrors` maps field name to message. Extra rules: a status or channel value outside its list is a field error; a date must match `YYYY-MM-DD` and survive a round trip through `Date.UTC` (so `2026-02-30` fails) with a year from 1900 to 2100; website is at most 2,048 characters and is rejected when the URL carries a username or password.

Shared transaction rules (in `src/studio/data/`):
- `lockLiveClient(tx, clientId)` (`clients.ts`): selects the client `for update` where `id` and `workspace_id = getWorkspaceId()` match, and throws `ClientNotFound` when missing or `ClientArchived` when archived. Every write on a contact, project, or note runs in a transaction that calls it first, so the lock order is always client, then child, matching `archiveClient`. `updateClient` takes the same lock before its versioned update.
- Every child read and write matches three ids: `id = $child and client_id = $clientId and workspace_id = $ws`, with `$clientId` from the URL or form. A mismatch throws that child's `NotFound`.
- An archived contact or project counts as not found for every read and write, except its archive function, which returns it unchanged (the same as `archiveClient`).
- `pgErrorOf(err)` (`errors.ts`) walks `err.cause` until it finds an object with a Postgres `code` (Drizzle 0.45 wraps driver errors in `DrizzleQueryError`); every unique violation translation uses it and checks `code === "23505"` and the `constraint` name. The app checks before writing as well, but the database is what settles a race. New error classes go in `errors.ts`, each with its stable `code`: `InvalidInput` (`INVALID_INPUT`, carries `fieldErrors`), `DuplicateClientName`, `DuplicateContactEmail`, `StaleRecord`, `ClientArchived`, `ContactNotFound`, `NoteNotFound`, `ProjectHasLiveContracts`. A Postgres unique violation (`23505`) whose constraint is `clients_workspace_name_uq` or `contacts_client_email_uq` is translated into the matching duplicate error; any other database error is rethrown as is. Every id from the URL or a form is checked against the uuid shape first; a bad shape throws the matching `NotFound`, so Postgres never sees it (no `22P02` error, no 500).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| every read and write | workspace | `getWorkspaceId()` from the session (spec 0005); children also take the parent client's `workspace_id`, as in spec 0004 |
| list | rows, sort, page size | `clients` where `archived_at is null` (or `is not null` with `archived=1`), order `lower(name), id`, constant `CLIENT_PAGE_SIZE = 50` |
| list | total and whether next or previous exists | `count(*)::int` over the same filter; previous when `page > 1`, next when `page * 50 < total` |
| list | `page` | URL `page`, parsed as a whole number, anything else or below 1 becomes 1, anything above 10,000 becomes 10,000 |
| list | which empty message | the **List states** table; the "no clients yet" and "no archived clients" checks use one extra unfiltered count, run only when `total` is 0 |
| list | last activity | `greatest(clients.updated_at, max(contacts.updated_at), max(projects.updated_at), max(notes.updated_at))` over that client's rows (archived children included), as correlated subqueries in `listClients` |
| list | primary contact name | left join `contacts` on `client_id` where `is_primary and archived_at is null` (at most one, by the unique index) |
| list, detail | last activity, "Archived on", note times | `src/studio/format.ts`, constant `STUDIO_TIME_ZONE = "Asia/Manila"`: `formatDate(d)` = `Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone })` for last activity and "Archived on"; `formatDateTime(d)` = `{ dateStyle: "medium", timeStyle: "short", timeZone }` for note times |
| detail | project dates | the `date` column string, formatted with `timeZone: "UTC"` so no day shifts |
| detail | "Archived on" | client `archived_at`, same formatter |
| detail | "edited" marker | note `updated_at > created_at` |
| detail | "Showing the latest 100 notes" | `noteTotal` (`count(*)` of the client's notes) greater than 100 |
| status labels | display text | a label map next to the constants (`on_hold` → "On hold", others capitalised), in `src/studio/format.ts` |
| edit forms | `version` | `updated_at::text` selected with the row (full microsecond precision; a JS `Date` would drop it and every check would fail), sent as a hidden field |
| every update | stale check | `update ... where id = $id and workspace_id = $ws and updated_at = $version::timestamptz`; zero rows after the row was found means `StaleRecord` |
| every update | new `updated_at` | Drizzle `$onUpdate`, as in spec 0004 |
| new contact form | primary ticked by default | the client has no live contact with `is_primary` (from `getClientDetail`) |
| set primary | clearing the old primary | inside the contact transaction, after locking the client row: `update contacts set is_primary = false where client_id = $c and is_primary and archived_at is null and id <> $id`. This moves the old primary's `updated_at` on purpose, so an edit form still open on it goes stale instead of quietly taking primary back. |
| website | stored value | trimmed input; `https://` prefixed when it has no `scheme://`; kept only if `new URL()` parses with protocol `http:` or `https:` and the host has a dot |
| website link | rendered link | stored value, `target="_blank" rel="noopener noreferrer"`; only `http` or `https` values ever reach an `href` |
| archive client, archive project | live contract check | `exists` a contract of that client (or project) with `status in ('signed', 'active')` and `archived_at is null`, inside the transaction after the client row lock |
| any write on a child | `ClientArchived` | the parent client row, locked `for update`, has `archived_at` set |
| search `q` escaping | literal match | replace `\` with `\\`, `%` with `\%`, `_` with `\_`, wrap in `%`, compare `lower(name) like lower($q) escape '\'` |

**Key invariants**:
- No query in this feature runs without the workspace filter, and no page or action runs before `requireStudioAccess()`.
- Nothing is hard deleted except notes. Archive never cascades and is never undone.
- Writes on contacts, projects, and notes of an archived client always fail, checked under the client row lock.
- A client has at most one live primary contact at every moment (database index plus the clear then set transaction).
- Every edit either applies to the exact version you saw or fails with `StaleRecord`; no edit silently overwrites a newer one.
- The database checks from spec 0004 stay the last line of defence; the app checks exist to give field level messages, not to replace them.

**Security model**: One owner, one workspace (specs 0004 and 0005). Pages and actions are reachable only after `requireStudioAccess()`; the proxy redirect is a first filter only. Server actions validate every id against the workspace, so a forged form post with another workspace's id gets a not found result. Contact email and phone are personal data under the Philippine Data Privacy Act: read only through the server only data layer, rendered only on signed in pages, never logged, never sent to analytics (the studio layout has no Analytics). Note bodies and website values render as text (React escaping); only checked `http` or `https` URLs become links. Studio pages keep `noindex, nofollow` and `force-dynamic` from the studio root layout.

**Configuration required**: none. No new environment variable, secret, or migration.

**Critical test scenarios**:
- Happy path: signed in on a seeded dev branch, create "Demo Studio Co", add two contacts (the first is primary), add a project, add a note, edit the client's status to `active`; the list shows it with its primary contact, verifies **AC-2**, **AC-4**, **AC-5**, **AC-7**, **AC-8**, **AC-9**
- Search: `q=demo` finds it, `q=%` finds only names containing a literal `%`, `status=past` hides it, and a reload keeps the filters, verifies **AC-3**
- Duplicate: create "demo studio co" while "Demo Studio Co" is live → field error on name, row count unchanged, verifies **AC-4**
- Stale edit: open the edit page in two tabs, save in one, save in the other → the second shows the stale message and the database keeps the first save, verifies **AC-5**
- Primary move: mark the second contact primary → the first loses it in the same save; the list shows the second, verifies **AC-7**
- Archive refused: archive the seeded client with an active contract → refusal message, still listed, verifies **AC-6**
- Archived read only: archive a client with no live contracts → it leaves the list, shows under `archived=1`, its page has no controls, and posting `createNoteAction` for it by hand returns `CLIENT_ARCHIVED` with no new row, verifies **AC-6**
- Project rules: actual end date with status `active` → field error; end before start → field error, verifies **AC-8**
- Not found: `/studio/clients/not-a-uuid`, a random uuid, a uuid inserted by SQL into another workspace, and `/studio/clients/<A>/contacts/<a contact of B>/edit` each show the not found page, verifies **AC-10**
- Archive race: start `archiveClient` and `createClientNote` on the same client together with `Promise.all` → either the note lands first and the client archives after, or the note is refused with `ClientArchived`; never a note created after `archived_at` was set, verifies **AC-6**
- Duplicate under the ORM: force a duplicate name past the app check (two creates at once) → the loser shows the field error, not `UNEXPECTED`, and the log has no Postgres key text, verifies **AC-4**, **AC-11**
- Auth: signed out, open `/studio/clients/<id>` → redirect to login with `next`; POST a client action with no cookie → redirect, nothing written, verifies **AC-1**
- Boundary: `npm run build` ends with `[leak-check] clean` and a search of the build logs and server logs for a seeded contact email finds nothing, verifies **AC-11**
- Accessibility: tab through the create form and the archive dialog by keyboard only; submit an empty form and hear the error read out; check 375px wide in both themes, verifies **AC-12**

## Build plan

Tracer Bullet: the first task is a thin thread through every layer (route, guard, action, data function, database, back to the page), and each later task thickens it with one more record type, each complete with its states before the next starts. No migration in any task.

1. Thin thread: `Clients` header link; `src/studio/format.ts` and `src/studio/data/input.ts`; the new error classes with `pgErrorOf` and `lockLiveClient`; `notFoundOr`; `listClients` (no search yet, with last activity) and `getClientDetail` (client fields only); `createClient` with the duplicate name translation; `createClientAction`; the list page with paging and both empty states; the new client page; the detail page showing the client fields; `loading.tsx`, `error.tsx`, `not-found.tsx`; the uuid shape check. Satisfies **AC-1**, **AC-2**, **AC-4**, **AC-10**
2. Find, edit, archive the client: search, status filter, and `archived=1` on the list; `updateClient` with the version check and its edit page; add the shadcn `AlertDialog`, the `ConfirmSubmit` component, and `archiveClientAction` over the existing `archiveClient`; the archived banner, the read only detail page, and the redirect away from edit pages of an archived client. Satisfies **AC-3**, **AC-5**, **AC-6**
3. Contacts: `contacts.ts` (create, update, archive, with the client lock, the primary move, and the email duplicate translation); the three contact actions; the contacts section with its empty state; the add and edit pages; primary shown on the list. Satisfies **AC-6**, **AC-7**
4. Projects: `projects.ts` (create, update, archive with the live contract refusal); the three project actions; the projects section with its empty state; the add and edit pages with date fields. Satisfies **AC-6**, **AC-8**
5. Notes: `notes.ts` (create client note, update with version, delete); the three note actions; the notes section with the add box, the latest 100 cap, the edited marker, and the delete dialog; the note edit page. Satisfies **AC-6**, **AC-9**
6. Hardening pass: check every action's error path keeps values and focuses the message; review every `console.error` for personal data, and confirm no log or error boundary prints action state or a raw Postgres message; mobile stacked cards and both themes; run `npm run lint` and `npm run build` and confirm `[leak-check] clean`. Satisfies **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:
- The studio becomes useful day to day, and the pattern set here (server page, guarded action, workspace scoped data function, version check, coded errors) is the one contracts and the systems map will copy.
- No schema change, so nothing runs unattended in the Vercel build for this feature.
- Pages work without client JavaScript except for the dialogs and pending buttons.

**Negative / tradeoffs**:
- One route per form means more files and a page load per edit, compared with inline editing.
- Hand written input checks must be kept in step with the database checks by hand; a new rule means touching both.
- Double clicking create on a contact, project, or note can still make two rows if the click lands before the button disables (only client names are unique). Accepted for a single owner; the pending button makes it rare.
- Name search is substring only: no fuzzy matching, and no search across contacts yet.
- Archived contacts and projects disappear from view with no way to see them in this feature.

**Neutral**:
- Adds the shadcn `AlertDialog` (and its Radix package) to `src/components/ui/`.
- Client and project status lists stay as spec 0004 left them; the spec 0004 follow up on pagination, search, and status rules is settled here.

## Follow-up

- [ ] Add a `pg_trgm` index on `lower(name)` if the client list ever passes about 5,000 rows.
- [ ] Decide whether search should also match contact names and emails.
- [ ] A view of archived contacts and projects, if you find you need it.
- [ ] Notes on contacts and projects (the table already supports them).
- [ ] The retention rule for archived contact data (Deferred in the scope) should be settled before real client data goes in.
- [ ] `/sync`: record in `src/studio/AGENTS.md` the client tracking routes, `src/studio/clients/actions.ts`, the `ActionState` shape, the version check pattern (`updated_at::text`), and `STUDIO_TIME_ZONE`.
