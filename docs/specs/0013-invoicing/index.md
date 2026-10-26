# 0013. Invoicing: line item invoices from contracts, numbered at send, a PDF frozen in private Blob

**Date**: 2026-10-26
**Status**: In Progress

## Summary

You create an invoice from an active or ended contract, list what you are billing as lines (description, quantity, unit price), and download a watermarked draft PDF while you work on it. When you mark it sent, it gets the next number for the year (like `INV-2026-0001`, with no gaps), its issue and due dates are fixed, and that exact PDF is saved to the private Blob store (file storage with no public links). After that the invoice only moves along allowed steps (sent to paid, paid back to sent to fix a mistake, sent to void), each step recorded, and every file is served only through guarded server code. Your own business details (name, address, payment instructions) live in a billing profile in the studio, never in the public repo.

## Requirements

**User stories**:
- As Ed, I want to create an invoice from a contract with its lines prefilled, so that billing a client takes a minute and matches what we agreed.
- As Ed, I want a correct PDF with my business details and payment instructions, and the exact file I sent kept on record, so that what the client received never changes behind my back.
- As Ed, I want invoice numbers assigned in order when I send, with no gaps, so that my records hold up when an accountant or the tax office looks at them.
- As Ed, I want to mark an invoice paid (with the date and how it was paid), undo a mistake, or void a wrong invoice, with each change recorded, so that I always know who still owes me.
- As Ed, I want to see each client's and each contract's invoices, and every open or overdue one in a single list, so that nothing goes unpaid by accident.

**Acceptance criteria** (the contract):
- **AC-1**: `/studio/invoices/profile` holds your billing profile, one per workspace: business name (required, at most 200), address (required, at most 1,000, line breaks kept), TIN (optional, at most 30, digits and hyphens only, else "Use digits and hyphens only."), email (optional, at most 320, checked with the studio `EMAIL_PATTERN`, else "Enter an email like name@example.com."), phone (optional, at most 50), payment instructions (required, at most 2,000, line breaks kept), tax note (optional, at most 200, printed under the total, e.g. "Non VAT registered"), document title (required, at most 60, default `Invoice`), and default payment terms in days (required, whole number 0 to 365, default 15). The first save creates it; later saves use the version check (a stale edit is refused with "This was changed elsewhere. Reload to see the latest.").
- **AC-2**: A contract page shows "New invoice" only when the contract is `active` or `ended`, not archived, and its client is live. The form has lines (1 to 50; each with description required at most 500, quantity from 0.01 to 99,999.99 with at most 2 decimals, unit price in pesos from 0 to 9,999,999,999.99 with at most 2 decimals and optional thousands commas), payment terms in days (0 to 365), bill to address (optional, at most 1,000), and notes (optional, at most 2,000). It opens prefilled: one line with the contract title, quantity 1, and the contract amount as unit price (empty when the contract has none), payment terms from the profile (15 when there is no profile), and the bill to address of this client's most recent live invoice (empty when none). You can add, remove, and reorder lines (up and down buttons, keyboard reachable; the add button is disabled at 50 lines); each line amount and the total update as you type. Saving creates the invoice as `draft` with its opening status event and opens its page. A line amount or a total above 9,999,999,999.99 is an error on the lines group ("The total is too large."). The other field messages are listed under Form and display details. Creating on a contract that is not `active` or `ended`, or is archived, is refused with "Invoices can be made only from an active or ended contract."; on an archived client with the `ClientArchived` message. The contract status is checked only at creation; later invoice writes check only that the contract and client are not archived. Currency is the contract's currency (always PHP today).
- **AC-3**: Each line's amount is quantity times unit price, rounded half up to the centavo, and the invoice total is the sum of its line amounts. Amounts show as `PHP 12,500.00`; quantities show without trailing zeros (`1`, `2.5`). The database refuses a line whose stored amount does not match this rule.
- **AC-4**: `/studio/invoices/<id>` shows the number (or "Draft"), the status (a sent invoice past its due date shows "Overdue"), the client and contract (linked), the issue and due dates (for a draft, "Set when sent"), the bill to block (client name, primary contact name and email when the client has a live primary contact, bill to address when set), the lines table, the total, the notes, the payment details once paid (date, method, reference), the status history newest first (from, to, date and time in Asia/Manila, note; the opening event reads "Created"), the allowed next steps, and a "Download PDF" link.
- **AC-5**: Every invoice field and its lines can be edited only while it is `draft`, with the version check and the AC-2 rules. The edit page of an invoice that is not a draft redirects to its page, and an edit that reaches the server anyway is refused with "Only a draft can be edited." and changes nothing. The database also refuses any change to the lines of an invoice that is not a draft, and any change to a sent invoice's number, dates, currency, terms, bill to address, or notes.
- **AC-6**: While an invoice is a draft, "Download PDF" returns a PDF made on demand and never stored: A4, the document title from the profile with `DRAFT` in place of the number, your business block (name, address, TIN, email, phone, each line only when set), the bill to block, the issue date shown as today and the due date as today plus the terms, the contract title as reference, the lines table (Description, Qty, Unit price, Amount), the total, the notes, the payment instructions, the tax note, `Page N of M` in the footer, and a large light `DRAFT` watermark on every page. With no billing profile yet, the business block reads `[Missing: billing profile]`; a draft with no lines still renders, with an empty table and a total of `PHP 0.00`. Text in any Latin script plus `₱`, `ñ`, curly quotes, and dashes renders correctly (the spec 0007 bundled font). The file name is `invoice-draft-<first 8 characters of the id>.pdf`.
- **AC-7**: "Mark sent" is refused, with nothing changed, when the invoice has no lines ("Add at least one line before sending."), the total is zero ("The total must be more than zero."), no billing profile is saved yet ("Complete your billing profile before sending." with a link to it; a saved profile always has every required field, so a row existing is the whole check), or the invoice changed since the page loaded (the stale message). Otherwise the next number for the year is reserved for the PDF, the issue date is today in Asia/Manila, the due date is the issue date plus the terms, the PDF is rendered without a watermark and saved to the private Blob store, and then one transaction takes that number, moves the invoice `draft → sent`, stores the number and dates, writes its status event, and records the file (size, SHA-256, linked to that event). From then on "Download PDF" returns that PDF byte for byte, named `<number>.pdf`. If saving the file fails, nothing changes and you see "The PDF could not be saved. Nothing was changed." If the transaction fails after the file was saved, the file is deleted (best effort, and only after confirming no `invoice_files` row with that id committed) and nothing changes. If a client, contact, contract, or profile value used in the PDF changed while it rendered, sending is refused with the stale message and nothing changes. If another invoice took the reserved number meanwhile, the file is deleted and the send retries once on its own with the next number; if that also loses, it is refused with "Another invoice was sent at the same time. Try again." and nothing changes. The issue date is fixed when the PDF renders, so a send that straddles midnight in Asia/Manila keeps the earlier date (accepted).
- **AC-8**: Numbers are `INV-<year>-<n>`, `n` zero padded to at least 4 digits, counting from 1 per workspace and per issue year (Asia/Manila). Only sent invoices hold a number; a draft that is discarded never uses one; a number is never reused, including by a void invoice. Two sends racing get two different consecutive numbers or one is refused; never the same number twice and never a gap.
- **AC-9**: The invoice page offers one button per step in `INVOICE_TRANSITIONS` for the current status, each with a confirmation dialog: "Mark paid" (paid date required, prefilled with today in Asia/Manila, not before the issue date and not after today; method optional: Bank transfer, GCash, Maya, Cash, Check, Other; reference optional at most 200; note optional at most 1,000), "Undo paid" (back to sent, clears the payment details, note optional), and "Void invoice" (a reason note is required, at most 1,000). Each step form posts the status it was shown from, and each step writes exactly one status event; a step that is no longer allowed, was posted from a status that is no longer current, or lost a race shows "This invoice's status changed. Reload to see the latest." and changes nothing. `void` shows no steps. A void invoice keeps its number and its frozen PDF, and its page and every list mark it "Void".
- **AC-10**: A draft can be discarded ("Discard draft", with confirmation), which archives it: it drops out of every list except the archived toggle, its page shows "Discarded on <date>" with no controls except "Download PDF" (the watermarked draft render), and every write on it is refused. There is no undo. Only a draft can be discarded ("Only a draft can be discarded."), and not on an archived contract or client (those drafts stay read only). Sent, paid, and void invoices are never archived or deleted.
- **AC-11**: A contract page has an Invoices section listing its live invoices (number or Draft, status with Overdue, total, due date), newest change first, with "New invoice" (per AC-2) and a summary line: billed (sent plus paid, void excluded), paid, and the contract amount when set. A live client's page has an Invoices section listing its live invoices with the contract title. `/studio/invoices` lists every live invoice in your workspace with its client and contract, filterable by status (`draft`, `sent`, `overdue`, `paid`, `void`; `sent` includes overdue ones, `overdue` is the subset of sent invoices whose due date is before today in Asia/Manila, so a due date of today is not overdue; an unknown value shows all and an invalid page becomes 1, the spec 0006 rule), with an archived toggle (`?archived=1`, discarded drafts only), 25 per page, newest change first (`invoices.updated_at`, which every edit, step, and discard moves). The studio nav gains an Invoices link, and the invoice list links to the billing profile.
- **AC-12**: Archiving a contract that has a `sent` invoice is refused with "Settle or void this contract's open invoices before archiving.", and archiving a client with a `sent` invoice is refused with "Settle or void this client's open invoices before archiving." Every invoice write on an archived contract is refused with `ContractArchived`, and on an archived client with `ClientArchived`; those pages are read only.
- **AC-13**: Every invoice and profile page, server action, and the PDF route call `requireStudioAccess()` first. Signed out, a PDF URL redirects to the login page and returns no file bytes. An invoice of another workspace or a malformed id returns the not found page. PDF responses carry `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, and `Content-Disposition: inline`. A sent invoice whose file row or Blob file is missing returns a 404 response and logs `FILE_MISSING`, never a fallback render. No Blob URL or pathname ever reaches the browser. Logs carry only the action or route name and the error code, never invoice lines, profile details, or client details. The leak check passes.
- **AC-14**: `npm run db:seed` adds a clearly fake billing profile and one fake draft invoice with two lines on the seeded active contract (`ID.bakeryContract`, "Example storefront build"), and a rerun changes nothing.
- **AC-15**: Invoice and profile pages have loading, error, and not found states, work at phone width and in both themes, and `npm run lint` and `npm run build` (including the leak check) pass. The PDF route and "Mark sent" work in a production build (`npm run build` then `npm run start`).

## Decision

**Chosen option**: Option 2: Dedicated invoice tables with line items, a gapless per year counter taken at send, and the spec 0007 freeze pattern for the PDF

New `invoices`, `invoice_lines`, `invoice_status_events`, `invoice_files`, `invoice_number_counters`, and `billing_profiles` tables; database triggers keep sent invoices and their lines frozen; the PDF reuses spec 0007's `@react-pdf/renderer` setup and bundled fonts with a new invoice layout, and is frozen in private Blob at send, put first and transaction second.

**Implementation skills**: `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) · `neon-postgres` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn-ui` (`jezweb/claude-skills`, `.claude/skills/shadcn-ui/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (one additive migration plus one custom migration for the triggers; every new table in the `studio` schema with `workspace_id` and the shared column helpers):

| Table | Columns | Rules |
|---|---|---|
| `billing_profiles` (new) | `workspace_id uuid pk` → `workspaces`, `business_name text not null`, `address text not null`, `tin text null`, `email text null`, `phone text null`, `payment_instructions text not null`, `tax_note text null`, `document_title text not null default 'Invoice'`, `default_payment_terms_days smallint not null default 15`, `created_at`, `updated_at` | Not blank checks on business name, address, payment instructions, document title; length checks per AC-1; `tin ~ '^[0-9-]+$'` when set; terms between 0 and 365. One row per workspace (the primary key). |
| `contracts` (add index) | | Unique `contracts_id_client_uq` on (`id`, `client_id`), so invoices can reference the pair. |
| `invoices` (new) | `id uuid pk`, `workspace_id`, `client_id uuid not null` → `clients` (restrict), `contract_id uuid not null`, `status text not null default 'draft'`, `number text null`, `issued_on date null`, `due_on date null`, `payment_terms_days smallint not null`, `currency text not null`, `bill_to_address text null`, `notes text null`, `paid_on date null`, `payment_method text null`, `payment_reference text null`, `archived_at timestamptz null`, `created_at`, `updated_at` | Composite FK (`contract_id`, `client_id`) → `contracts` (`id`, `client_id`) restrict. Checks: status in `INVOICE_STATUSES`; payment method in `PAYMENT_METHODS`; `(status = 'draft') = (number is null)`; `(number is null) = (issued_on is null) and (number is null) = (due_on is null)`; `number ~ '^INV-[0-9]{4}-[0-9]{4,}$'`; `due_on >= issued_on`; `(status = 'paid') = (paid_on is not null)`; `paid_on >= issued_on`; payment method and reference null unless paid; `archived_at is null or status = 'draft'`; terms 0 to 365; lengths per AC-2 and AC-9. Unique `invoices_workspace_number_uq` on (`workspace_id`, `number`) where number is not null. Indexes on (`workspace_id`, `status`, `due_on`), (`contract_id`), (`client_id`). |
| `invoice_lines` (new) | `id uuid pk`, `workspace_id`, `invoice_id uuid not null` → `invoices` (restrict), `position smallint not null`, `description text not null`, `quantity_hundredths integer not null`, `unit_price_minor bigint not null`, `amount_minor bigint not null`, `created_at` | Checks: position 1 to 50; description not blank, at most 500; quantity 1 to 9,999,999; unit price 0 to 999,999,999,999; `amount_minor` 0 to 999,999,999,999; `amount_minor = (quantity_hundredths::numeric * unit_price_minor + 50) / 100` evaluated in `numeric` then floored (`floor(...)::bigint`), so the largest quantity times the largest price cannot overflow `bigint` inside the check itself. Unique (`invoice_id`, `position`). |
| `invoice_status_events` (new) | `id uuid pk`, `workspace_id`, `invoice_id` → `invoices`, `from_status text null`, `to_status text not null`, `changed_at timestamptz not null default now()`, `note text null`, `created_at` | Same checks as `contract_status_events` (statuses in the list, opening event is `draft`, from and to differ, one opening event per invoice). Index on (`invoice_id`, `changed_at`). Append only trigger. |
| `invoice_files` (new) | `id uuid pk`, `workspace_id`, `invoice_id uuid not null` → `invoices`, `status_event_id uuid not null` → `invoice_status_events`, `blob_pathname text not null`, `size_bytes integer not null`, `sha256 text not null`, `created_at`. No `updated_at`. | Size positive; SHA-256 hex check; unique on `invoice_id` (one frozen PDF per invoice), on `status_event_id`, and on `blob_pathname`. Append only trigger. |
| `invoice_number_counters` (new) | `workspace_id`, `year smallint not null`, `last_number integer not null`, `updated_at` | Primary key (`workspace_id`, `year`); `last_number >= 1`; year 2000 to 9999. |

Triggers (custom migration, same pattern as `0007_contract_files_append_only.sql`): `invoice_status_events_append_only` and `invoice_files_append_only` raise on update or delete; `invoice_lines_draft_only` raises on insert, update, or delete when the parent invoice's status is not `draft` or its `archived_at` is set; `invoice_frozen_fields` raises when `OLD.status <> 'draft'` (so the `draft → sent` update itself may set the number and dates) and the update changes `number`, `issued_on`, `due_on`, `currency`, `payment_terms_days`, `bill_to_address`, `notes`, `client_id`, or `contract_id` (status, the payment columns, `archived_at`, and `updated_at` stay writable for the steps), and raises on any delete of an invoice.

Workspace in the composite keys: the (`contract_id`, `client_id`) key does not include `workspace_id`, matching the existing `contracts_project_client_fk`; with one owner and every query scoped by `getWorkspaceId()` this is accepted, not enforced by the database.

New constants in `src/studio/db/constants.ts`: `INVOICE_STATUSES = ["draft", "sent", "paid", "void"]`, `INVOICE_TRANSITIONS`, `PAYMENT_METHODS = ["bank_transfer", "gcash", "maya", "cash", "check", "other"]` with `PAYMENT_METHOD_LABELS` (Bank transfer, GCash, Maya, Cash, Check, Other) beside it, like `SYSTEM_LAYER_LABELS`; invoice status labels come from the existing `statusLabel()` (Draft, Sent, Paid, Void). Relationships: workspace 1:1 billing profile, 1:N invoices and counters · client 1:N invoices · contract 1:N invoices · invoice 1:N lines and events, 0..1 file · status event 0..1:1 file. Blob pathname: `ws/<workspaceId>/invoices/<invoiceId>/<fileId>.pdf`, written like spec 0007 (`access: "private"`, `addRandomSuffix: false`, `allowOverwrite: false`, `contentType: "application/pdf"`).

**State transitions** (`INVOICE_TRANSITIONS`):

```
draft → sent → paid
          │  ↑    │
          │  └────┘ (paid → sent, Undo paid)
          └→ void
draft: discard (archive), not a status
```

Side effects: `draft → sent` reserves the number, fixes the dates, and freezes the PDF in the same transaction as its event; `→ paid` sets the payment columns; `paid → sent` clears them; `→ void` needs a note. Only `draft` allows edits.

**Money math** (`src/studio/invoices/money.ts`, pure, no `server-only`, shared with the client form): `parseQuantity("2.5") → 250` hundredths (`^\d{1,5}(\.\d{1,2})?$`, then at least 1); unit price parsed with the spec 0007 amount rule into centavos; `lineAmountMinor(q, u) = (BigInt(q) * u + 50n) / 100n`, the same rule as the database check; each line amount and then `invoiceTotalMinor(lines)` (their sum) is checked against 999,999,999,999 with `BigInt` before any write; `formatQuantity(250) → "2.5"`. Amounts display through the existing `formatAmount()`.

**PDF rendering** (`src/studio/invoices/pdf/render.tsx`, `server-only`): `renderInvoicePdf(view, { draft })` returns a `Buffer` via `renderToBuffer`. It reuses the Noto Sans registration from `src/studio/contracts/pdf/` (export the existing registration helper rather than copying it; the fonts stay where `outputFileTracingIncludes` already traces them), A4, 2 cm margins, the header (document title and number), the business and bill to blocks side by side, a row labelled "Issue date", "Due date", and "Reference", the lines table with right aligned money columns (Unit price and Amount as bare numbers like `12,500.00`, the currency shown once in the header "Amount (PHP)" and in the total `PHP 12,500.00`) (a row never splits across pages, the header row repeats on each page), the total, notes, payment instructions, tax note, the fixed footer placed with `top` (spec 0007 rule), and the `DRAFT` watermark for drafts. Loaded with a dynamic `import()` only when rendering, like the contract renderer. The PDF route and the invoice page set `runtime = "nodejs"` and `maxDuration = 30`.

**API surface** (server actions take `(prev: ActionState, formData)` and return `ActionState`; the route is a `GET` route handler, `runtime = "nodejs"`, dynamic):

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/studio/invoices/profile` | page | | profile form (empty with defaults when none) | owner session | none |
| `saveBillingProfileAction` | action | AC-1 fields, `version` (empty for the first save) | redirect back with a saved message | owner session | `INVALID_INPUT`, `STALE_RECORD` (also when the first save finds a row already there) |
| `/studio/contracts/[contractId]/invoices/new` | page | | prefilled invoice form | owner session | `CONTRACT_NOT_FOUND`; a contract that cannot invoice redirects to its page |
| `createInvoiceAction` | action | `contractId`, `lines[]` (`description`, `quantity`, `unitPrice`, in form order), `paymentTermsDays`, `billToAddress?`, `notes?` | redirect to `/studio/invoices/<id>` | owner session | `INVALID_INPUT` (fields and per line errors), `CONTRACT_NOT_INVOICEABLE`, `CONTRACT_ARCHIVED`, `CLIENT_ARCHIVED`, `CONTRACT_NOT_FOUND` |
| `/studio/invoices` | page | `?status=`, `?archived=1`, `?page=` | invoices with client, contract, total, due date, last change | owner session | none |
| `/studio/invoices/[invoiceId]` | page | | AC-4 view | owner session | `INVOICE_NOT_FOUND` |
| `/studio/invoices/[invoiceId]/edit` | page | | form (draft only, else redirect) | owner session | `INVOICE_NOT_FOUND` |
| `updateInvoiceAction` | action | `invoiceId`, `version`, the create fields minus `contractId` | redirect to the invoice page | owner session | `INVALID_INPUT`, `INVOICE_NOT_EDITABLE`, `STALE_RECORD`, `INVOICE_ARCHIVED`, `CONTRACT_ARCHIVED`, `CLIENT_ARCHIVED` |
| `sendInvoiceAction` | action | `invoiceId`, `version` (the `→ sent` event note is null) | redirect to the invoice page | owner session | `INVOICE_EMPTY`, `INVOICE_TOTAL_ZERO`, `BILLING_PROFILE_MISSING`, `STALE_RECORD`, `INVOICE_STATUS_CONFLICT`, `INVOICE_NUMBER_RACE`, `PDF_RENDER_FAILED`, `FILE_STORE_FAILED`, the archived errors |
| `changeInvoiceStatusAction` | action | `invoiceId`, `from` (the status the dialog was shown for), `to` (`paid`, `sent`, `void`), `note?` (required for void), `paidOn?`, `paymentMethod?`, `paymentReference?` (paid only) | redirect to the invoice page | owner session | `INVALID_INVOICE_TRANSITION`, `INVOICE_STATUS_CONFLICT`, `INVALID_INPUT`, the archived errors |
| `discardInvoiceAction` | action | `invoiceId` | redirect to the contract page | owner session | `INVOICE_NOT_DISCARDABLE`, `INVOICE_NOT_FOUND`, the archived errors |
| `/studio/invoices/[invoiceId]/pdf` | route | | `application/pdf`, `Content-Disposition: inline; filename="…"` | owner session (redirect when signed out) | 404 not found |

Data layer (`src/studio/data/`, `server-only`, every query scoped by `getWorkspaceId()`):
- `billing-profiles.ts`: `getBillingProfile()` (with `version`), `saveBillingProfile(version | null, input)` (insert when `version` is empty, refusing with `StaleRecord` if a row already exists; else the versioned update). Sending only needs the row to exist, since every required column is `not null` and not blank.
- `invoices.ts`: `createInvoice(contractId, input)`, `getInvoiceView(id)` (invoice, lines in position order, client, primary contact, contract, events, file, profile, `version`), `getNewInvoiceDefaults(contractId)`, `updateInvoice(id, version, input)` (one transaction: lock client, contract, then the invoice `for update`, check the version and `draft` there, then delete and insert all lines and bump `updated_at`), `sendInvoice(id, version, note)`, `changeInvoiceStatus(id, to, input)` over an inner `applyInvoiceStep(tx, invoice, to, note)` that returns the event row, `discardInvoice(id)`, `listInvoices({ status, archived, page })`, `listContractInvoices(contractId)` with the billed and paid sums, `listClientInvoices(clientId)`.
- `invoice-files.ts`: `recordInvoiceFile(tx, …)`, `getInvoiceFile(invoiceId)`.
- `invoice-numbers.ts`: `peekNextNumber(tx | db, year)` (`last_number + 1`, or 1 when no row), `takeNumber(tx, year)` (`insert … on conflict (workspace_id, year) do update set last_number = invoice_number_counters.last_number + 1 returning last_number`, which also locks the row), `formatInvoiceNumber(year, n)`.
- `contracts.ts` and `clients.ts` (extend): `archiveContract()` and `archiveClient()` refuse when a `sent` invoice exists (`ContractHasOpenInvoices`, `ClientHasOpenInvoices`), counted inside their existing transactions after the client (and contract) locks, so the shared lock order keeps a concurrent send from slipping past. Drafts do not block archiving; they become read only.
- Reuse `storage/blob.ts` (`putPrivatePdf`, `getPrivateFile`, `deletePrivateFile`) and `contracts/file-response.ts` for the headers.

`sendInvoice` order: read the view (draft, not archived, contract and client live, version matches) → refuse no lines, zero total, no profile → capture the render stamp (below) → issue date = today in `STUDIO_TIME_ZONE`, due date = issue date plus terms, `peekNextNumber(year)` → render the PDF with that number → SHA-256 → `putPrivatePdf` → one transaction: `lockClientThenContract`, lock the invoice `for update`, check `updated_at = version` (else `StaleRecord`; the invoice version covers its fields and lines, since every line write bumps it) and status still `draft` (else `InvoiceStatusConflict`), read the render stamp again under the locks and compare (any difference is `StaleRecord`), `takeNumber(year)` and compare with the peeked number (a difference throws `InvoiceNumberRace`; the transaction rolls back so the counter does not move), update the invoice (status, number, dates), `applyInvoiceStep(… "sent" …)`, `recordInvoiceFile(status_event_id)` → on any error after the put, look up the `invoice_files` row by its id and delete the Blob file only when no row exists (if that lookup itself fails, the orphan is accepted), then rethrow. On `InvoiceNumberRace` only, the whole send runs once more from the peek; a second `InvoiceNumberRace` reaches the user as "Another invoice was sent at the same time. Try again."

Render stamp (what "a value changed while it rendered" means): the tuple (`clients.updated_at`, `contracts.updated_at`, `billing_profiles.updated_at`, the live primary contact's `id` and `updated_at` or `none`), each as `::text`, compared as strings. The PDF reads only these rows plus the invoice and its lines, so an equal stamp proves every printed value is current. Error check order in every invoice write: `InvoiceNotFound`, `InvoiceArchived`, `ContractArchived`, `ClientArchived`, then the step or edit rules. Every step and the discard run under the same locks, compare the posted `from` with the locked status (a mismatch is `InvoiceStatusConflict`), and bump `updated_at`.

**Form and display details**:
- Input normalization (every text field, through the studio `Collector` in `data/input.ts`): trim, turn CRLF into LF, a blank optional field becomes null, and length limits count after that. Line descriptions are single line (newlines collapse to spaces) so table rows stay predictable; address, payment instructions, and notes keep line breaks.
- Field messages: the `Collector` defaults ("<Label> is required.", "<Label> must be at most N characters."); quantity "Enter a quantity from 0.01 to 99,999.99, with at most 2 decimals."; unit price "Enter an amount in pesos, like 12,500 or 12500.00." (the spec 0007 amount message); terms "Enter whole days from 0 to 365."; no lines "Add at least one line."; more than 50 "An invoice can have at most 50 lines."; total too large on the lines group; paid date "Choose a date from the issue date to today."; void without a note "Say why this invoice is void."; payment method outside the list "Choose a valid payment method.". Per line errors key as `lines.<index>.<field>`.
- Lines arrive as parallel form arrays (`lineDescription`, `lineQuantity`, `lineUnitPrice`) in display order. Lock order everywhere: client, contract, invoice. Step and send buttons use `PendingButton`, so a double click sends once.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| any read or write | workspace | `getWorkspaceId()` from the session (spec 0005) |
| `createInvoice` | `client_id`, `currency` | the contract row read in the same transaction (`contracts.client_id`, `contracts.currency`) |
| new invoice form | first line description, unit price | `contracts.title`; `contracts.amount_minor` as a plain decimal through `amountInputValue()`, empty when null |
| new invoice form | payment terms | `billing_profiles.default_payment_terms_days`, else 15 |
| new invoice form | bill to address | `bill_to_address` of this client's most recent live invoice by `created_at`, else empty |
| `createInvoice`, `updateInvoice` | `quantity_hundredths`, `unit_price_minor`, `amount_minor`, `position` | inputs parsed by `money.ts`; `amount_minor` from `lineAmountMinor()`; `position` is the 1 based form order |
| `createInvoice`, `updateInvoice` | total limit | `invoiceTotalMinor(lines)` checked against 999,999,999,999 before writing |
| invoice page, lists, PDF | total | sum of `invoice_lines.amount_minor` (one `sum()` per invoice in list queries; `invoiceTotalMinor()` on the view) |
| `sendInvoice` | `issued_on` | today in `STUDIO_TIME_ZONE` at render time; the same value goes into the PDF and the row |
| `sendInvoice` | `due_on` | `issued_on` plus `payment_terms_days` (calendar days, date arithmetic, no time zone shift) |
| `sendInvoice` | `number` | `formatInvoiceNumber(year of issued_on, takeNumber())`, equal to the peeked number rendered into the PDF |
| draft PDF | number, dates | `DRAFT`; today and today plus terms in `STUDIO_TIME_ZONE` at render |
| PDF | business block, title, payment instructions, tax note | `billing_profiles` columns; `[Missing: billing profile]` when no row (draft only, sending requires it) |
| PDF, invoice page | bill to | `clients.name`; the client's live primary contact `name` and `email` (spec 0007 rule); `invoices.bill_to_address` |
| PDF | reference | `contracts.title` |
| invoice page, lists | "Overdue" | status `sent` and today in `STUDIO_TIME_ZONE` after `due_on` (derived, never stored) |
| `/studio/invoices?status=overdue` | filter | `status = 'sent' and due_on < <today in Manila>` with today passed as a parameter |
| invoice page | issue and due date display | `formatPlainDate()` on the date columns |
| lists | order | `invoices.updated_at desc, invoices.id` (every edit, step, and discard bumps `updated_at`) |
| lists | status filter, page | `?status=`: a column match, except `overdue` (derived) and `sent` (includes overdue); unknown value → all; `?page=` through `parsePage()` from `clients/list-params.ts` |
| contract Invoices section | billed, paid | sum of totals of invoices with status in (`sent`, `paid`), and with status `paid`, live only |
| `changeInvoiceStatus` to paid | `paid_on`, `payment_method`, `payment_reference` | inputs; `paid_on` prefilled with today in `STUDIO_TIME_ZONE`, checked against `issued_on` and today |
| `changeInvoiceStatus` | expected current status | the hidden `from` input, compared with the locked row |
| `sendInvoice` | render stamp | `updated_at::text` of the client, contract, and profile rows plus the primary contact's `id` and `updated_at::text` (or `none`), read before render and again under the locks |
| PDF, invoice page | bill to without a primary contact | client name only; the contact lines are left out and sending is not blocked |
| `changeInvoiceStatus` paid to sent | payment columns | set to null in the same update |
| `sendInvoice` | `invoice_files` `id`, `blob_pathname`, `size_bytes`, `sha256` | `crypto.randomUUID()` before the put; the pathname pattern above; length and `crypto.createHash("sha256")` of the bytes |
| `sendInvoice` | `status_event_id` | the event row returned by `applyInvoiceStep()` in the same transaction |
| PDF route | which bytes | status `draft` → render on demand; otherwise the stored file from `getInvoiceFile()` (missing row or Blob file → 404 and `FILE_MISSING`) |
| PDF route | file name | `invoice-draft-<id first 8>.pdf` for a draft, `<number>.pdf` otherwise |
| edit forms | `version` | `updated_at::text` (studio rule); empty for a profile not yet saved |
| `discardInvoice` | repeat discard | returns the row unchanged (success), like the other archives |
| seed | profile, invoice, lines, opening event | fixed uuids through `runInWorkspace()` with `on conflict do nothing`, on a seeded active contract |

**Key invariants**:
- An invoice's fields and lines change only while it is `draft` (application rule plus the `invoice_lines_draft_only` and `invoice_frozen_fields` triggers). Status changes only through `applyInvoiceStep()`, one step from `INVOICE_TRANSITIONS`, with exactly one event.
- `status = 'draft'` exactly when `number` is null; every number is unique per workspace and comes from `invoice_number_counters` inside the send transaction, so a rolled back send leaves no gap.
- Every sent, paid, or void invoice has exactly one `invoice_files` row linked to its `draft → sent` event, and "Download PDF" returns exactly the bytes whose SHA-256 is on record. This is an application invariant (only `sendInvoice()` leaves `draft`); the database enforces at most one file per invoice, not at least one.
- Every line amount equals `(quantity_hundredths * unit_price_minor + 50) / 100` (database check); the total is always computed from the lines, never stored.
- An invoice's client is always its contract's client (composite foreign key).
- `invoice_status_events` and `invoice_files` are never updated or deleted, and invoices are never deleted (triggers). No seed or reset script may delete them; reset a dev branch from its parent instead.
- A frozen PDF never holds values older than those committed with its send (the render stamp is compared inside the transaction).
- Retention (spec 0011) is unchanged: an invoice always sits on a contract, and contracts already block client removal.

**Security model**: one owner, every surface behind `requireStudioAccess()` and scoped to the session workspace; child reads match `id`, `invoice_id`, and `workspace_id` together; every id is checked for uuid shape first and a bad one is a `NotFound`. Invoices, lines, and the billing profile (which holds your address, TIN, and bank or wallet details for payment instructions) are confidential business data; they live only in the database and private Blob, never in the repo, seed data stays fake, and logs carry only the action or route name and the error `code`. No regulated payment data: the studio never touches card numbers or moves money, it only records that a payment happened. The PDF is served only by its route handler, which streams from Blob and never reveals a Blob URL or pathname. `money.ts` is pure code with no data or secrets, so it skips `server-only` like `contracts/markdown.ts` (note this at `/sync`).

**Configuration required**: no new variables or dependencies. Reuses `BLOB_READ_WRITE_TOKEN`, `@react-pdf/renderer`, and the Noto Sans files already traced into `/studio/**`.

**Critical test scenarios**:
- Happy path: seed, save the profile, create an invoice from the seeded active contract (prefilled line), add a second line with quantity 2.5, download the draft PDF (watermarked, totals right), mark sent, download twice and compare the SHA-256 with the stored one, mark paid, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-7**, **AC-9**
- Rounding: quantity 0.33 times PHP 100.01 gives PHP 33.00 on the page, in the PDF, and in the row; a hand written insert with a wrong amount is refused by the check, verifies **AC-3**
- Numbering: send three invoices, void the second, discard a fourth draft: numbers are 0001, 0002, 0003 with no gap and 0002 still shown as Void; a send that fails after the put (forced) leaves the counter unmoved and the Blob file deleted; the first send of a new year starts at 0001, verifies **AC-7**, **AC-8**
- Race: edit the draft in one tab, then mark sent from a stale tab → `STALE_RECORD`, no number taken, no file row; rename the client between render and commit → `STALE_RECORD`; send two different invoices at once (a test hook between peek and take) → both end sent with consecutive numbers after one automatic retry, verifies **AC-7**, **AC-8**
- Limits: a line of 99,999.99 times 9,999,999,999.99 → "The total is too large." with nothing written (no overflow error), verifies **AC-2**, **AC-3**
- Frozen: after sending, the edit page redirects; a direct SQL update of a sent invoice's notes or a line is refused by the triggers, verifies **AC-5**
- Steps: void without a note → field error; paid date before the issue date → field error; undo paid clears the payment details; void shows no steps, verifies **AC-9**
- Rules: New invoice is absent on a signed contract; archive a contract or client with a sent invoice → refused; a step on an archived client's invoice → `ClientArchived`; discard a sent invoice → refused, verifies **AC-2**, **AC-10**, **AC-12**
- Lists: an invoice past its due date appears under `?status=overdue` and shows Overdue; the contract summary excludes void, verifies **AC-11**
- Auth: signed out `GET /studio/invoices/<id>/pdf` → redirect to login, no bytes; another workspace's id → 404; headers include `private, no-store` and `nosniff`, verifies **AC-13**
- Production build: `npm run build && npm run start`, download a draft and a sent invoice PDF with `₱` and `ñ` in a line, verifies **AC-6**, **AC-15**

## Build plan

Tracer Bullet: the first slice runs the riskiest path end to end (profile → invoice with lines → draft PDF → number and freeze in Blob → serve the frozen file) on real tables, then each later slice thickens it.

1. **Thin thread: contract to frozen, numbered invoice.**
   1. Migration: all six new tables, the `contracts` unique index, the new constants, plus the custom migration for the four triggers; apply on the dev branch, satisfies **AC-3**, **AC-5**, **AC-8**
   2. `money.ts` with unit tests, including the half up cases and a test that the TypeScript rule matches the database check, satisfies **AC-3**
   3. `billing-profiles.ts` and the profile page and action, satisfies **AC-1**
   4. Export the font registration from the contract renderer; `renderInvoicePdf()` with the table, footer, and watermark; the PDF route serving the draft render, satisfies **AC-6**, **AC-13**
   5. `createInvoice()`, `getNewInvoiceDefaults()`, the new invoice page with the dynamic lines form, and "New invoice" on the contract page, satisfies **AC-2**, **AC-3**
   6. `getInvoiceView()` and the invoice page, satisfies **AC-4**
   7. `invoice-numbers.ts`, `invoice-files.ts`, `applyInvoiceStep()`, `sendInvoice()`, "Mark sent" with its dialog, the PDF route serving the stored file, satisfies **AC-7**, **AC-8**, **AC-13**
   8. Seed the fake profile and draft invoice, satisfies **AC-14**
2. **Every step.** Mark paid with its fields, undo paid, void with a required note, `INVOICE_TRANSITIONS`, the conflict message, the Overdue label, satisfies **AC-9**, **AC-4**
3. **Edit, discard, lists, and guards.** Draft edit (versioned, lines replaced, redirect otherwise), discard and the read only discarded page, the contract Invoices section with the summary, the client Invoices section, `/studio/invoices` with filters, overdue, archived toggle, and paging, the nav link, the archive guards on contracts and clients, the archived errors on every invoice write, satisfies **AC-5**, **AC-10**, **AC-11**, **AC-12**
4. **Hardening.** Loading, error, and not found states (no route wide `loading.tsx` over a lookup, per the studio rule), every error message path, logs free of invoice and profile content, phone width and both themes, lint, build with leak check, and the production build PDF check, satisfies **AC-13**, **AC-15**

## Consequences

**Positive**:
- Billing runs inside the studio from the contracts you already track, which is the first real slice of your Invoicing product with you as customer zero.
- Gapless numbers taken inside the send transaction, plus frozen fields and lines enforced by the database, give you records that hold up in a dispute or an audit.
- The PDF pipeline, fonts, private Blob storage, and file serving are all reused from spec 0007, so the only new rendering work is the invoice layout.
- Your business and payment details stay out of the public repo.

**Negative / tradeoffs**:
- No tax computation: the tax note is printed text only. A VAT registered setup, withholding, or BIR registered invoice rules need a later decision.
- One payment per invoice: partial payments must be recorded as one payment once fully paid, or handled with separate invoices.
- A wrong sent invoice can only be voided and reissued under a new number, never edited.
- Four triggers add database behaviour that is invisible from TypeScript; a seed or script that touches sent invoices will fail loudly, by design.
- Archiving a contract or a client now also checks for open invoices, a small behaviour change to specs 0006 and 0007.
- A crash between the Blob put and the cleanup can leave an orphan private file (harmless, never served), like spec 0007.

**Neutral**:
- Discarded drafts stay in the database as archived rows; they never take a number.
- The PDF of a void invoice is the original sent copy; "Void" shows on the studio page, not in the file.
- Payment terms and bill to address are per invoice, so changing the profile default changes only new invoices.

## Follow-up

- [ ] Tax: decide VAT or percentage tax lines, withholding (Form 2307), and whether studio invoices must meet BIR registered invoice rules; check with your accountant before using these as official invoices.
- [ ] Partial payments: a payments table if real clients pay in parts.
- [ ] Home dashboard (spec 0012): add overdue invoices as an attention signal and an invoice status bar.
- [ ] Sending invoices by email from the studio (Resend is already in the stack for lead intake alerts).
- [ ] Recurring invoices for monthly contracts (a "next invoice" prompt or a scheduled draft).
- [ ] Orphan cleanup script for `ws/<id>/invoices/` Blob files without a row (extend the spec 0007 follow up).
- [ ] `/sync`: record in `src/studio/AGENTS.md` the invoice rules (draft only edits enforced by triggers, numbers taken at send inside the transaction, peek then take, put first and transaction second, lock order client then contract then invoice, the `money.ts` `server-only` exception, and the open invoice archive guards).
