# 0013. Invoicing: rationale

Decision record for [index.md](index.md). `/develop` builds from the index; this file explains why.

## Context

> ⚠️ Premise note: in the Philippines the invoice is now the primary tax document, and an official invoice must come from a BIR registered system or a printed booklet with authority to print. A PDF the studio makes may not count as one. This spec builds a correct, auditable billing invoice with gapless numbers and a configurable document title (so it can read "Billing Statement" if your accountant says so), and leaves tax compliance as a follow up decision rather than guessing it here.

Feature 29 in the scope asks for invoices made from active contracts, tracked from draft to sent to paid, with a private PDF, as the next step toward your Invoicing product. Spec 0007 already gives contracts a clean state machine, a private Blob store, a server side PDF renderer with bundled fonts, and the pattern of freezing the exact file that was sent. Spec 0004's data model has no invoice tables yet, and the contract row carries only a single amount and a billing cadence (one time, monthly, milestone), which is not enough to describe what a given invoice bills.

The forces are money and records. Amounts must be exact (integer centavos, one rounding rule everywhere), what the client received must never change, and numbers must be in order with no gaps, because a gap or a silently edited sent invoice is the first thing an accountant or a tax examiner questions. At the same time this is a one owner studio at Beta: the design must stay simple enough to build in a few slices and run with no new infrastructure.

Your business details (name, address, TIN, bank or wallet details for payment) have to appear on every invoice, but the repo is public, so they cannot live in code or templates the way contract wording used to be planned. Spec 0007 left exactly this as a follow up.

Choices made for this run: you asked to take every recommended option, so each dimension below records the recommended pick and its runner up.

## Options considered

### Option 1: One amount per invoice on the contract tables

Add a few columns to an `invoices` table holding a single description and amount prefilled from the contract, reuse `contract_files` for the PDF, and number invoices when they are created.

**Pros**:
- Smallest build: no line table, no counters, no new triggers.
- Matches the contract's single amount field directly.

**Cons**:
- No breakdown on the PDF, which clients often ask for (hours, milestones, expenses).
- Numbering at create leaves gaps whenever a draft is thrown away.
- Mixing invoice files into `contract_files` blurs two lifecycles and their append only rules.

### Option 2: Dedicated invoice tables with line items, a gapless counter at send, and the spec 0007 freeze pattern (chosen)

Separate tables for invoices, lines, events, files, counters, and the billing profile; numbers taken inside the send transaction; database triggers keep sent invoices frozen; the PDF reuses the existing renderer and fonts.

**Pros**:
- Line items cover one time, monthly, and milestone billing the same way.
- Gapless numbers and database enforced immutability give records you can defend.
- Reuses proven pieces (renderer, fonts, private Blob, file serving, put first then transaction).

**Cons**:
- Six tables and four triggers is real schema work for one feature.
- The send path is the most involved write in the studio (peek a number, render, put, then a transaction that takes the number and compares values).

### Option 3: An external invoicing service

Create invoices in a hosted invoicing or accounting tool through its API and store only references in the studio.

**Pros**:
- Tax handling, numbering, emailing, and payment links come built in.
- Some providers handle local compliance for you.

**Cons**:
- Client billing data leaves your systems, and every invoice depends on a third party being up.
- A new account, API key, webhooks, and reconciliation, all for one owner's volume.
- It defeats the goal of growing your own Invoicing product with you as customer zero.

## Rationale

Option 2 fits the forces in Context. Exact money and unchangeable sent records are the core of invoicing, and both are cheapest to guarantee in the database: a check constraint ties each line amount to the rounding rule, triggers refuse edits to a sent invoice and its lines, and the counter row taken inside the send transaction means a failed send rolls the number back, so issued numbers never have gaps. Option 1 is faster but fails the records force on two counts (gaps and no breakdown), and Option 3 fails the product goal and adds operational weight a single owner studio does not need.

The send path keeps spec 0007's rule of no Blob I/O inside a database transaction. The number has to be printed in the PDF before the transaction, so the action peeks the next number, renders and stores the file, then takes the number inside the transaction and refuses if it differs. With one owner it differs only when two invoices are sent at the same moment from two tabs (the same invoice sent twice already fails the version check). For that case the send deletes its file and retries once on its own with the next number, so the race costs a second render rather than an error, and only a second loss reaches you as a message. Holding the transaction open across rendering and the upload (the runner up) was rejected because Vercel can kill a request mid transaction and leave a lock behind, which the systems import already had to work around.

Recommended picks per dimension, with runners up:

- **Which contracts invoice**: `active` and `ended` (a final bill after the work ends). Runner up: active only.
- **Invoice content**: line items with quantity in hundredths and unit price in centavos. Runner up: a single amount.
- **Statuses**: draft, sent, paid, void, with Overdue derived from the due date and never stored. Runner up: adding partially paid with a payments table (deferred).
- **Numbering**: `INV-<year>-<n>` per workspace and issue year, taken at send. Runner up: numbered at create (leaves gaps).
- **Correcting a mistake**: void and reissue; only "Undo paid" moves backward, because a payment recorded by mistake changes no document. Runner up: allowing sent back to draft (rejected, it would orphan a used number).
- **Discarding a draft**: archive it (drafts have no number, so nothing is lost). Runner up: hard delete (rejected, the studio never deletes business rows).
- **Business details**: a `billing_profiles` row per workspace edited in the studio. Runner up: columns on `workspaces` (rejected, it mixes billing fields into the tenant table and every workspace query).
- **Bill to**: client name and primary contact from the live rows, plus a per invoice bill to address prefilled from the client's last invoice. Runner up: an address column on `clients` (a spec 0006 change for a single use).
- **Tax**: none computed, a printed tax note only. Runner up: a VAT line now (rejected without knowing your registration type).
- **Due dates**: payment terms in days per invoice, default from the profile (15). Runner up: a typed due date.
- **Line totals**: stored, but verified by a database check against the same expression the TypeScript uses, so they can never drift. Runner up: computed only at read time (two implementations of rounding, one in SQL for lists, one in TypeScript).
- **Invoice total**: always computed from the lines, never stored.
- **Archive guards**: refuse archiving a contract or client that has a sent (unpaid) invoice, so an archived record never hides money owed. Runner up: allow steps on archived records (rejected, it breaks the read only archived rule from specs 0006 and 0007).
- **PDF of a void invoice**: the original frozen bytes, marked Void only in the studio. Runner up: a new render with a VOID stamp (rejected, it breaks the rule that stored bytes are what was sent).
- **Files table**: a separate `invoice_files` with one row per invoice. Runner up: reusing `contract_files` with a nullable invoice id.
- **References**: none, keep the spec clean.
- **Agent skills and MCP servers**: no new tool was chosen (everything reuses the existing stack), so no search was run.
