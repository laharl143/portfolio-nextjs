# 0007. Contracts and PDF export: studio templates, a draft you can edit, and a PDF frozen in private Blob when sent

**Date**: 2026-10-19
**Status**: Accepted

## Summary

You write contract templates inside the studio (a small Markdown subset, with placeholders like `{{client.name}}`), then create a contract for a client from one of them. The template text is copied onto the contract, so you can tweak it while the contract is a draft, and later template edits never touch it. While it is a draft you can download a watermarked preview PDF, made on demand. When you mark it sent, that exact PDF is saved to the private Blob store (file storage with no public links) and every later download returns those same bytes; you can also attach the signed copy you get back. Status moves only along the spec 0004 steps, each one recorded, and every file is served only through guarded server code.

## Requirements

**User stories**:
- As Ed, I want contract templates in the studio, so that my contract wording stays private (the repo is public) and I reuse it for every client.
- As Ed, I want to create a contract for a client from a template and adjust it while it is a draft, so that each client gets the right terms without retyping.
- As Ed, I want a correct PDF to send, and the exact file I sent kept on record, so that what the client received never changes behind my back.
- As Ed, I want to move a contract only along allowed steps with each change recorded, and keep the signed copy, so that the history is complete when Invoicing builds on it.
- As Ed, I want to see each client's contracts from the client page and all contracts in one list, so that I know what is waiting on a signature.

**Acceptance criteria** (the contract):
- **AC-1**: `/studio/templates` lists the live templates of your workspace (name, description, last updated), newest update first, 25 per page. You can create and edit a template: name (required, at most 200, unique among live templates in your workspace ignoring case, else the field error "A template with this name already exists."), description (optional, at most 500), body (required, at most 50,000 characters). The body may only use placeholders from the placeholder list (see Feature design); each unknown `{{…}}` is a field error naming it. The editor shows the placeholder list and a live preview of the formatted body. Edits use the version check (a stale edit is refused with "This was changed elsewhere. Reload to see the latest."). Archiving a template asks for confirmation, removes it from the list and the template picker, and never changes a contract. There is no delete and no unarchive.
- **AC-2**: On a live client's page, "New contract" opens a form: template (required, one of the live templates or "Blank"), title (required, at most 200), project (optional, the client's live projects), amount (optional, pesos with at most 2 decimals and optional thousands commas, from 0 to 9,999,999,999.99), billing cadence (optional: one time, monthly, milestone), start date and end date (optional, end not before start), terms summary (optional, at most 2,000). Saving creates the contract as `draft` with its opening event, copies the template body onto the contract (empty for Blank), records which template it came from, and opens the contract page. Currency is always PHP in this feature.
- **AC-3**: `/studio/contracts/<id>` shows the title, client (linked), project, status, amount as `PHP 12,500.00`, billing cadence, dates, terms summary, the sent and signed dates (from the status history), a preview of the body with every placeholder filled in (an empty value shows as a highlighted "Missing: <label>"), the status history newest first (from, to, date and time in Asia/Manila, note), the files list, the allowed next steps, and a "Download PDF" link.
- **AC-4**: Every field and the body can be edited only while the contract is `draft`, with the version check, the same field rules as AC-2, and the same placeholder rule as AC-1. The edit page of a contract that is not a draft redirects to its page, and an edit that reaches the server anyway is refused with "Only a draft can be edited." and changes nothing.
- **AC-5**: While a contract has no frozen PDF to serve, "Download PDF" returns a PDF made on demand and never stored: A4, the body with its headings, paragraphs, line breaks, bold, italic, bullet and numbered lists, and page breaks, placeholders filled in (empty ones printed as `[Missing: <label>]`), `Page N of M` in the footer, and a large light watermark on every page: `DRAFT` while the status is `draft` or the contract was never sent (no `sent` event, e.g. cancelled from draft), `NOT THE SENT COPY` for a contract that passed through `sent` but has no frozen PDF (only seeded or legacy rows). Text in any Latin script plus `₱`, `ñ`, curly quotes, and dashes renders correctly (bundled font). The file name is `<title-slug>-draft.pdf`.
- **AC-6**: "Mark sent" is refused, with nothing changed, when the body is empty ("Add the contract text before sending.") or any placeholder in it has no value ("Fill these before sending: <labels>."), or the contract changed since the page loaded (the stale message). Otherwise the PDF is rendered without a watermark (`{{today}}` is the send date in Asia/Manila) and saved to the private Blob store, then one transaction moves the contract `draft → sent`, writes its status event, and records the file (kind `sent_pdf`, size, SHA-256, linked to that event). From then on, while the status is not `draft`, "Download PDF" returns the latest sent PDF byte for byte, named `<title-slug>.pdf`. If saving the file fails, nothing changes and you see "The PDF could not be saved. Nothing was changed." If the transaction fails after the file was saved, the file is deleted (best effort, and only after confirming no `contract_files` row with that id committed) and nothing changes. If a client, primary contact, or project value used in the PDF changed while it rendered, sending is refused with the stale message and nothing changes.
- **AC-7**: The contract page offers one button per step in `CONTRACT_TRANSITIONS` for the current status (Back to draft, Mark sent, Mark signed, Mark active, Mark ended, Cancel contract), each with a confirmation dialog and an optional note (at most 1,000). Each step writes exactly one status event; a step that is no longer allowed or lost a race shows "This contract's status changed. Reload to see the latest." and changes nothing. After `sent → draft` the contract is editable again, the earlier sent PDF stays in the files list as "Sent on <date>, replaced", and sending again freezes a new PDF. `ended` and `cancelled` show no steps.
- **AC-8**: The "Mark signed" dialog takes an optional signed copy, and a contract in `signed`, `active`, or `ended` offers "Add signed copy". The file must be a PDF (starts with `%PDF-`) of at most 4 MB, else the field error "Choose a PDF of 4 MB or less." and nothing changes, including the status step. The file input checks the size in the browser first, because Vercel rejects a request over about 4.5 MB before the action runs. A stored copy is kind `signed_copy` and appears in the files list (newest first) with its date and size; several are allowed.
- **AC-9**: A live client's page has a Contracts section listing its live contracts (title, status, amount, last change), newest change first, with "New contract". `/studio/contracts` lists every live contract in your workspace with its client, filterable by status, with an archived toggle (`?archived=1`, archived only), 25 per page, newest change first. The studio nav gains Contracts and Templates links.
- **AC-10**: Archiving a contract asks for confirmation and is allowed only for `draft`, `ended`, or `cancelled` ("Only a draft, ended, or cancelled contract can be archived."). An archived contract drops out of the lists (except the archived toggle), its page shows "Archived on <date>" with no edit, step, upload, or archive controls, every write on it is refused with `ContractArchived`, and its files stay downloadable. Every contract write on an archived client's contract (including status steps and uploads) is refused with `ClientArchived` and changes nothing; its pages are read only.
- **AC-11**: Every contract and template page, server action, and file route calls `requireStudioAccess()` first. Signed out, a PDF or file URL redirects to the login page and returns no file bytes. A contract or file of another workspace, a malformed id, or a file id of another contract returns the not found page. File responses carry `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`; generated PDFs are served `inline`, uploaded signed copies (untrusted content) always as `attachment`. A file row whose Blob file is missing returns the not found page and logs `FILE_MISSING`, never a fallback render. No Blob URL or pathname ever reaches the browser (file links use file ids). Logs carry only the action or route name and the error code, never contract text or client details. The leak check passes.
- **AC-12**: `npm run db:seed` adds one clearly fake template ("Example service agreement") that uses every placeholder, and a rerun changes nothing. Existing seeded contracts keep an empty body.
- **AC-13**: Contract and template pages have loading, error, and not found states, work at phone width and in both themes, and `npm run lint` and `npm run build` (including the leak check) pass. The PDF routes and "Mark sent" work in a production build (`npm run build` then `npm run start`), which proves the font files are traced into the server output.

## Decision

**Chosen option**: Option 1: Database templates in a Markdown subset, text snapshot per contract, `@react-pdf/renderer` on the server, PDF frozen in private Blob at sent

Templates live in a new `contract_templates` table, each contract stores its own copy of the body with placeholders resolved at render time, PDFs are rendered in Node by `@react-pdf/renderer` with a bundled Noto Sans font, a draft PDF is made on demand with a watermark, and the sent PDF (plus any signed copy) is stored in the private Blob store and recorded in an append only `contract_files` table.

**Implementation skills**: `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) · `neon-postgres` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn-ui` (`jezweb/claude-skills`, `.claude/skills/shadcn-ui/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (one additive migration plus one custom migration for the trigger; every new table in the `studio` schema with `workspace_id`, `created_at`, and the shared column helpers):

| Table | Columns | Rules |
|---|---|---|
| `contract_templates` (new) | `id uuid pk`, `workspace_id uuid not null` → `workspaces`, `name text not null`, `description text null`, `body text not null`, `created_at`, `updated_at`, `archived_at timestamptz null` | Check `length(trim(name)) > 0`; check `char_length(body) <= 50000`. Unique `contract_templates_workspace_name_uq` on (`workspace_id`, `lower(name)`) where `archived_at is null`. Index on (`workspace_id`, `updated_at desc`). |
| `contracts` (add columns) | `template_id uuid null` → `contract_templates` (restrict), `body text not null default ''` | Check `char_length(body) <= 50000`. Existing rows get `''`. `template_id` is provenance only, never read to render. |
| `contract_files` (new) | `id uuid pk`, `workspace_id uuid not null` → `workspaces`, `contract_id uuid not null` → `contracts`, `kind text not null` in (`sent_pdf`, `signed_copy`), `status_event_id uuid null` → `contract_status_events`, `blob_pathname text not null`, `size_bytes integer not null`, `sha256 text not null`, `created_at timestamptz not null default now()`. No `updated_at`. | Check `size_bytes > 0`; check `sha256 ~ '^[0-9a-f]{64}$'`; check `kind <> 'sent_pdf' or status_event_id is not null`. Unique on `blob_pathname`; unique on `status_event_id` where not null. Index on (`contract_id`, `kind`, `created_at desc`). Trigger `contract_files_append_only` (custom migration, same pattern as `contract_status_events_append_only`) raises on any `update` or `delete`. |

`CONTRACT_FILE_KINDS` joins `src/studio/db/constants.ts`. Relationships: workspace 1:N templates and files · template 0..1:N contracts · contract 1:N files · status event 0..1:1 sent PDF. Blob pathname: `ws/<workspaceId>/contracts/<contractId>/<fileId>.pdf`, written with `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: false`, `contentType: "application/pdf"`.

**Placeholders** (the only names allowed; `{{ name }}` with optional inner spaces, lowercase; one list in `src/studio/contracts/placeholders.ts`). Rules: every `{{…}}` token in the raw body (regex `\{\{([^{}]*)\}\}`) must, once trimmed, match a name below exactly, else it is unknown and the field error names it as typed (so `{{Client.Name}}` and `{{client.*x*}}` are unknown); a lone `{{` with no closing `}}` is literal text; there is no escape for `{{`. A value is missing when it is null or blank after trimming (an amount of 0 is present); the missing list names each label once, in first appearance order. Newlines inside a value collapse to single spaces:

| Placeholder | Label | Value |
|---|---|---|
| `client.name` | Client name | `clients.name` |
| `client.contact_name` | Primary contact | the client's contact with `is_primary` true and not archived (at most one, `contacts_one_primary_uq`), its `name`, else empty |
| `client.contact_email` | Primary contact email | that contact's `email`, else empty |
| `project.name` | Project | the contract's project `name` (archived or not), else empty |
| `contract.title` | Contract title | `contracts.title` |
| `contract.amount` | Amount | `formatAmount(amount_minor, currency)`, e.g. `PHP 12,500.00`, else empty |
| `contract.billing_cadence` | Billing | `statusLabel(billing_cadence)` (One time, Monthly, Milestone), else empty |
| `contract.start_date` / `contract.end_date` | Start date / End date | `formatPlainDate(...)`, else empty |
| `contract.terms_summary` | Terms summary | `contracts.terms_summary`, else empty |
| `today` | Today | today in Asia/Manila; in a frozen PDF, the send date |

Your own name, address, and signature lines are typed into the template itself (it is private now), so there are no provider placeholders.

**Markdown subset** (`src/studio/contracts/markdown.ts`, a pure module with no `server-only`, so the template editor's client preview and the server share it): blocks are `#`, `##`, `###` headings, paragraphs (blank line separated; single line breaks kept, for addresses), `- ` or `* ` bullet lists, `1. ` numbered lists, and a line of exactly `---` as a page break (a rule in the HTML preview). Inline: `**bold**`, `*italic*`, and `\*` for a literal star; a `{{…}}` token is an atomic unit the inline parser never splits. Anything else is literal text; no HTML, links, or images. It parses to a small block tree; the template editor preview shows each placeholder as a chip with its label, the contract preview shows the filled value; the preview renders that tree as React elements (never `dangerouslySetInnerHTML`) and the PDF renders it as `@react-pdf/renderer` elements. Placeholders are substituted inside text nodes after parsing, so a value is never read as Markdown.

**PDF rendering** (`src/studio/contracts/pdf/`, `server-only`): `renderContractPdf(view, { watermark })` returns a `Buffer` via `renderToBuffer`. A4, 2 cm margins, Noto Sans 10.5 pt (Regular, Bold, Italic, Bold Italic static TTFs committed in `pdf/fonts/` with their OFL license, registered once per process by absolute path from `process.cwd()`, after checking the files exist, so a missing font fails loudly as `PDF_RENDER_FAILED` instead of falling back to Helvetica), hyphenation turned off (`Font.registerHyphenationCallback(w => [w])`), footer `Page N of M` (fixed render prop), watermark as a fixed, rotated, light grey text. `@react-pdf/renderer` goes in `serverExternalPackages` unless Next already lists it, and `outputFileTracingIncludes` adds `src/studio/contracts/pdf/fonts/**` under the key `/studio/**` (route paths without route groups; actions are traced with the page that hosts them, so the contract page needs the fonts too). Server actions get a body limit of `4.5mb` (`experimental.serverActions.bodySizeLimit` in Next 16; confirm the key against the installed version), and uploads are capped at 4 MB to stay under Vercel's 4.5 MB request limit. The PDF route, the files route, and the contract page set `runtime = "nodejs"` and `maxDuration = 30`. First task of the PDF work: prove `@react-pdf/renderer` v4 renders under React 19 and a Turbopack `next build` before building on it.

**State transitions** (contract, unchanged from spec 0004, read from `CONTRACT_TRANSITIONS`):

```
draft → sent → signed → active → ended
  ↑      │
  └──────┘ (sent → draft)
draft, sent, signed → cancelled
```

Side effects added here: `draft → sent` freezes a `sent_pdf` in the same transaction as its event; `→ signed` may store a `signed_copy`; only `draft` allows edits. Every step (old and new paths) now also refuses an archived client with `ClientArchived`, on top of spec 0004's checks.

**API surface** (server actions take `(prev: ActionState, formData)` and return `ActionState`; routes are `GET` route handlers, `runtime = "nodejs"`, dynamic):

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/studio/templates` | page | `?page=` | live templates | owner session | none |
| `/studio/templates/new`, `/studio/templates/[templateId]/edit` | pages | | template form | owner session | `TEMPLATE_NOT_FOUND` |
| `createTemplateAction` / `updateTemplateAction` | actions | `name`, `description`, `body`; update adds `templateId`, `version` | redirect to `/studio/templates` | owner session | `INVALID_INPUT` (fields, unknown placeholders), `DUPLICATE_TEMPLATE_NAME`, `STALE_RECORD`, `TEMPLATE_NOT_FOUND` |
| `archiveTemplateAction` | action | `templateId` | redirect to the list | owner session | `TEMPLATE_NOT_FOUND` |
| `/studio/clients/[clientId]/contracts/new` | page | | contract form | owner session | `CLIENT_NOT_FOUND`; archived client redirects to its page |
| `createContractAction` | action | `clientId`, `templateId` (uuid or `blank`), `title`, `projectId?`, `amount?`, `billingCadence?`, `startDate?`, `endDate?`, `termsSummary?` | redirect to `/studio/contracts/<id>` | owner session | `INVALID_INPUT`, `CLIENT_ARCHIVED`, `CLIENT_NOT_FOUND`, `PROJECT_NOT_FOUND`, `TEMPLATE_NOT_FOUND` |
| `/studio/contracts` | page | `?status=`, `?archived=1`, `?page=` | contracts with client and last change | owner session | none |
| `/studio/contracts/[contractId]` | page | | AC-3 view | owner session | `CONTRACT_NOT_FOUND` |
| `/studio/contracts/[contractId]/edit` | page | | form (draft only, else redirect) | owner session | `CONTRACT_NOT_FOUND` |
| `updateContractAction` | action | `contractId`, `version`, the AC-2 fields minus template, `body` | redirect to the contract page | owner session | `INVALID_INPUT`, `CONTRACT_NOT_EDITABLE`, `STALE_RECORD`, `CONTRACT_ARCHIVED`, `CLIENT_ARCHIVED` |
| `changeContractStatusAction` | action | `contractId`, `to`, `note?`, `version` (required for `sent`), `signedCopy?` (File, only for `signed`) | redirect to the contract page | owner session | `INVALID_CONTRACT_TRANSITION`, `CONTRACT_STATUS_CONFLICT`, `STALE_RECORD`, `CONTRACT_EMPTY`, `CONTRACT_HAS_MISSING_VALUES`, `PDF_RENDER_FAILED`, `FILE_STORE_FAILED`, `INVALID_INPUT` (file), `CONTRACT_ARCHIVED`, `CLIENT_ARCHIVED` |
| `addSignedCopyAction` | action | `contractId`, `signedCopy` (File) | redirect to the contract page | owner session | `INVALID_INPUT`, `CONTRACT_NOT_SIGNED` (status not signed, active, or ended), `FILE_STORE_FAILED`, `CONTRACT_ARCHIVED`, `CLIENT_ARCHIVED` |
| `archiveContractAction` | action | `contractId` | redirect to the client page | owner session | `CONTRACT_NOT_ARCHIVABLE`, `CONTRACT_NOT_FOUND`, `CLIENT_ARCHIVED` |
| `/studio/contracts/[contractId]/pdf` | route | | `application/pdf`, `Content-Disposition: inline; filename="…"` | owner session (redirect when signed out) | 404 not found |
| `/studio/contracts/[contractId]/files/[fileId]` | route | | the stored file, same headers | owner session | 404 not found (other contract, other workspace, bad id) |

Data layer (`src/studio/data/`, `server-only`, every query scoped by `getWorkspaceId()`):
- `contract-templates.ts`: `listTemplates(page)`, `listLiveTemplateOptions()`, `getTemplate(id)`, `createTemplate(input)`, `updateTemplate(id, version, input)`, `archiveTemplate(id)`.
- `contracts.ts` (extend): `createContract()` gains `templateId` and `body`; `getContractView(id)` (contract, client, project, primary contact, events, files, `version` as `updated_at::text`); `listContracts({ status, archived, page })` and `listClientContracts(clientId)` with last change `max(changed_at)`; `updateContract(id, version, input)`; `sendContract(id, version, note)`; `changeContractStatus()` refactored over an inner `applyStatusStep(tx, contract, to, note)` that returns the event row, so `sendContract` and the signed step reuse it inside their own transaction.
- `contract-files.ts`: `recordContractFile(tx, …)`, `getContractFile(contractId, fileId)`, `latestSentPdf(contractId)`.
- `src/studio/storage/blob.ts` (extend): `putPrivatePdf(pathname, bytes)`, `getPrivateFile(pathname)` (the SDK `get(pathname, { access: "private", useCache: false })`, returns the stream), `deletePrivateFile(pathname)`.

`sendContract` order: read the contract (draft, not archived, client live, version matches) → resolve the placeholder value map and refuse empty body or missing values → render the PDF → SHA-256 → `putPrivatePdf` → one transaction: `lockLiveClient`, lock the contract `for update`, check `updated_at = version` (else `StaleRecord`) and status still `draft` (else `ContractStatusConflict`), resolve the value map again inside the transaction and compare it with the rendered one (any difference is `StaleRecord`), `applyStatusStep(… "sent" …)`, `recordContractFile(kind "sent_pdf", status_event_id)` → on any error after the put, look up the `contract_files` row by its id and delete the Blob file only when no row exists (a dropped connection after commit must not delete a committed file), then rethrow. The signed step with a file and `addSignedCopyAction` follow the same put first, transaction second, check then delete on failure order. Error check order in every contract write: `ContractNotFound`, `ContractArchived`, `ClientArchived`, then the step or edit rules. Step and send buttons use the existing `PendingButton`, so a double click sends once.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| any read or write | workspace | `getWorkspaceId()` from the session (spec 0005) |
| `createContract` | `body` | the chosen template's `body` read in the same call (live, same workspace); `''` for Blank |
| `createContract` | `template_id` | input `templateId`; null for Blank |
| `createContract` | `currency` | column default `PHP` (not an input in this feature) |
| `createContract`, `updateContract` | `amount_minor` | input `amount`: commas stripped, must match `^\d{1,10}(\.\d{1,2})?$`, converted to centavos as `bigint` |
| contract page, PDF | amount text | `formatAmount()` (new, `format.ts`): `Intl.NumberFormat("en-PH", { style: "currency", currency, currencyDisplay: "code" })` over `amount_minor / 100` |
| contract page | sent date, signed date | `changed_at` of the latest event with `to_status` `sent` / `signed` (spec 0004 rule, never stored) |
| lists | last status change | `max(contract_status_events.changed_at)` per contract (draft edits do not move a contract; intended), ties broken by `contracts.id` |
| lists | page, status filter | the spec 0006 `list-params.ts` parsing: an invalid page becomes 1, an unknown status is ignored |
| edit form | amount prefill | `amount_minor` as a plain decimal with 2 places, no prefix or commas (e.g. `12500.00`) |
| `createContractAction` | template archived since the form loaded | `TEMPLATE_NOT_FOUND` mapped to a field error on the template select |
| `archiveTemplate`, `archiveContract` | repeat archive | returns the row unchanged (success), like spec 0004 |
| seed | template row | fixed uuid, inserted through `runInWorkspace()` with `on conflict (id) do nothing` |
| preview, PDF | placeholder values | the Placeholders table above, read through `getContractView()` |
| draft PDF | `today` | the current date in `STUDIO_TIME_ZONE` at render |
| frozen PDF | `today` | the send date in `STUDIO_TIME_ZONE` (render happens in the send action) |
| PDF | watermark | status `draft`, or no event with `to_status` `sent` in the history → `DRAFT`; a `sent` event exists but no `sent_pdf` → `NOT THE SENT COPY`; frozen file → none (it is served as stored) |
| PDF route | which bytes | status not `draft` and `latestSentPdf()` exists → that stored file; else render on demand |
| PDF route, files route | file name | `slugify(title)` (lowercase ASCII letters, digits, single hyphens, at most 80, fallback `contract`); `/pdf` gives `<slug>-draft.pdf` or `<slug>.pdf` (latest sent); the files route gives `<slug>-sent-<n>.pdf` or `<slug>-signed-<n>.pdf`, `n` the chronological ordinal of that kind for the contract (oldest is 1) |
| files list | "Sent on <date>" | `changed_at` of the file's linked status event (joined in `getContractView()`); signed copies show the file's `created_at` |
| `contract_files` | `size_bytes`, `sha256` | length and `crypto.createHash("sha256")` of the bytes put to Blob |
| `contract_files` | `blob_pathname`, `id` | `id` from `crypto.randomUUID()` before the put; pathname from the pattern above |
| `contract_files` | `status_event_id` | the event row returned by `applyStatusStep()` in the same transaction (`sent_pdf` always; `signed_copy` when uploaded with the signed step, else null) |
| files list | "replaced" label | a `sent_pdf` that is not the latest one |
| edit forms | `version` | `updated_at::text` (studio rule) |
| upload check | is PDF, size | first 5 bytes equal `%PDF-`; `File.size <= 4 * 1024 * 1024` |

**Key invariants**:
- A contract's body and fields change only while it is `draft`; status changes only through `applyStatusStep()` (inside `changeContractStatus()`, `sendContract()`, or the signed step), each with exactly one event.
- Every `sent → …` contract created through this feature has a `sent_pdf` linked to its `draft → sent` event; what "Download PDF" returns after sending is exactly the bytes whose SHA-256 is on record.
- `contract_files` rows are never updated or deleted (trigger), and a Blob file is written once (`allowOverwrite: false`).
- A Blob file without a row can exist only after a failed delete; a row without a Blob file must never exist (put happens before the transaction).
- Placeholder values are substituted after Markdown parsing, so client data never becomes formatting.
- Template edits never change an existing contract.
- A frozen PDF never holds client, contact, or project values older than those committed with its send (value map compared inside the transaction).
- The append only trigger means no seed or reset script may delete `contract_files`; reset a dev branch from its parent instead.

**Security model**: one owner, every surface behind `requireStudioAccess()` and scoped to the session workspace; child reads match `id`, `contract_id`, and `workspace_id` together; every id is checked for uuid shape first and a bad one is a `NotFound`. Contract text and files are confidential client business data (no regulated scope). Files are served only by the two route handlers, which stream from Blob and never redirect to or reveal a Blob URL or pathname. Uploads are checked by magic bytes and size on the server; the stored content type is always `application/pdf`. Logs carry only the action or route name and the error `code` (studio rule). `markdown.ts` and `placeholders.ts` hold no secrets or data, so they skip `server-only` like `auth/cookie.ts` (note this exception in `src/studio/AGENTS.md` at `/sync`).

**Configuration required**: no new variables. Reuses `BLOB_READ_WRITE_TOKEN`. New dependency `@react-pdf/renderer` (v4, React 19 support) and the four Noto Sans TTF files. Production files go to `studio-prod`, local and preview to `studio-dev` (spec 0003); the studio is off in Preview, so the deployed check happens in Production after merge.

**Critical test scenarios**:
- Happy path: seed, create a contract from the example template for a seeded client, fill amount and dates, download the draft PDF (watermarked, values filled), mark sent, download again twice and compare the SHA-256 with the stored one, verifies **AC-2**, **AC-3**, **AC-5**, **AC-6**
- Missing values: a template using `{{contract.amount}}` on a contract with no amount → "Mark sent" refused listing Amount, status unchanged, no file row, verifies **AC-6**
- Race: edit the draft in one tab, then mark sent from a stale tab → `STALE_RECORD`, no event, no file row, Blob file deleted, verifies **AC-6**
- Rename during send: rename the client between render and commit (a test hook or a breakpoint) → `STALE_RECORD`, nothing frozen, verifies **AC-6**
- Back to draft: sent → draft → edit → send again → two `sent_pdf` rows, the first labelled replaced, download returns the second, verifies **AC-7**
- Signed copy: mark signed with a renamed PNG, or (locally) a 4.2 MB PDF → field error and status still `sent`; with a real PDF → `signed` plus a `signed_copy` row, verifies **AC-8**
- Rules: unknown `{{client.phone}}` in a template → field error; edit page of a sent contract redirects; archive an active contract → refused; step on an archived client's draft → `ClientArchived`, verifies **AC-1**, **AC-4**, **AC-10**
- Auth: signed out `GET /studio/contracts/<id>/pdf` → redirect to login, no PDF bytes; a file id of another contract → 404; response headers include `private, no-store` and `nosniff`, verifies **AC-11**
- Production build: `npm run build && npm run start`, download a draft PDF with `₱` and `ñ` in the body → renders, verifies **AC-5**, **AC-13**

## Build plan

Tracer Bullet: the first slice runs the riskiest path end to end (template → contract → draft PDF → freeze in Blob → serve the frozen file) on real tables, then each later slice thickens it.

1. **Thin thread: template to frozen PDF.**
   1. Migration: `contract_templates`, the two `contracts` columns, `contract_files`, `CONTRACT_FILE_KINDS`, plus the custom migration for `contract_files_append_only`; apply on the dev branch, satisfies **AC-1**, **AC-6**
   2. `placeholders.ts`, `markdown.ts`, `formatAmount()`, slug helper, satisfies **AC-1**, **AC-3**, **AC-5**
   3. Install `@react-pdf/renderer`, commit the Noto Sans files and license, `next.config.mjs` (`serverExternalPackages` if needed, `outputFileTracingIncludes`, server action body limit), `renderContractPdf()` with footer and watermark, satisfies **AC-5**, **AC-13**
   4. Seed the fake template, satisfies **AC-12**
   5. `createTemplate()`, `listTemplates()`, the templates list and new pages (placeholder list, live preview), satisfies **AC-1**
   6. `createContract()` with template and body, the new contract page and action from the client page, satisfies **AC-2**
   7. `getContractView()`, the contract page with preview and history, the PDF route (draft render), satisfies **AC-3**, **AC-5**
   8. Blob helpers, `applyStatusStep()` refactor, `sendContract()`, `recordContractFile()`, "Mark sent" with its dialog, the PDF route serving the latest sent PDF, satisfies **AC-6**, **AC-11**
2. **Every step and the signed copy.** All step buttons from `CONTRACT_TRANSITIONS` with confirm and note, the `ClientArchived` check on every step, back to draft and resend, the signed copy on the signed step and "Add signed copy", the files list and the files route, satisfies **AC-7**, **AC-8**, **AC-10**, **AC-11**
3. **Edit, archive, and lists.** Template edit and archive, contract edit (draft only, versioned, redirect otherwise), contract archive and the read only archived page, the client page Contracts section, `/studio/contracts` with status filter, archived toggle, and paging, the nav links, satisfies **AC-1**, **AC-4**, **AC-9**, **AC-10**
4. **Hardening.** Loading, error, and not found states, every error message path, logs free of contract text, phone width and both themes, lint, build with leak check, and the production build PDF check, satisfies **AC-11**, **AC-13**

## Consequences

**Positive**:
- Your contract wording stays out of the public repo, and templates are data you can grow into the CRM product.
- What the client received is kept byte for byte with a hash on record, which Invoicing and any dispute can rely on.
- One small parser drives both the preview and the PDF, so they never disagree, and client data can never inject formatting.
- No headless browser: rendering runs in a normal Node function with no binary to keep alive.

**Negative / tradeoffs**:
- The Markdown subset is limited: no tables, images, or columns. A logo or a two column signature block needs a later change to the renderer.
- About 2 MB of font files in the repo, and the font tracing is a deploy detail that only a production build proves.
- A crash between the Blob put and the cleanup can leave an orphan private file with no row (harmless, never served, but it costs storage until cleaned).
- Values filled at render mean a client rename changes the draft preview; after sending, only the frozen PDF holds the old name.
- Uploads stop at 4 MB (the Vercel request limit); a large scanned signed copy must be compressed first.
- `changeContractStatus()` now refuses an archived client's contract, a small behaviour change to spec 0004.

**Neutral**:
- `@react-pdf/renderer` becomes a server dependency; its layout model (flexbox like, not CSS) is new to the codebase.
- Seeded contracts walked past draft have no frozen PDF and show the `NOT THE SENT COPY` watermark.
- `contracts.template_id` is provenance only; renaming or archiving a template changes nothing on contracts.

## Follow-up

- [ ] Orphan cleanup: a script that lists `ws/<id>/contracts/` Blob files without a `contract_files` row and deletes them (manual, run on purpose).
- [ ] Business details (your name and address as placeholders, for Invoicing): add workspace columns when Invoicing needs them on invoices too.
- [ ] Contract notes (the notes table already allows `contract_id`) and an unarchive, both left out here.
- [ ] Richer PDF layout (logo, tables, two column signature block) if real contracts need it.
- [ ] `/sync`: record in `src/studio/AGENTS.md` the contract files rule (put first, transaction second, delete on failure), that only `draft` is editable, the `markdown.ts` and `placeholders.ts` `server-only` exception, the font tracing config, and the 4 MB upload cap.
- [ ] Agent skills for `@react-pdf/renderer`: the registry search found only very low adoption skills (1 to 2 installs each), so none was installed; follow the official react-pdf docs during the build.
