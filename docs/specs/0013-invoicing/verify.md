# Verify: invoicing · spec 0013 · updated 2026-10-27 (verified, see docs/reviews/0013-invoicing-verify.md)
_Steps derived from spec 0013 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones. Use only fake data on the Neon dev branch._

## UI / manual
- [x] Open `/studio/invoices/profile` with no profile row: fields empty, document title `Invoice`, terms `15`. Save with a TIN of `12a` → "Use digits and hyphens only."; an email `x@y` → "Enter an email like name@example.com." → AC-1
- [x] Save a valid profile, then save again from a second tab holding the old version → "This was changed elsewhere. Reload to see the latest." → AC-1
- [x] On the seeded active contract ("Example storefront build") the Invoices section shows "New invoice"; on the draft "Sample booking setup" and the cancelled "Demo stock sync pilot" it does not → AC-2
- [x] New invoice opens with one line (contract title, qty `1`, unit price `150000.00`), terms from the profile, and the bill to address of the client's most recent live invoice → AC-2, Value sourcing (new invoice form rows)
- [x] Change the profile's default terms to 30, open New invoice again → terms show 30; existing invoices keep their own terms → Value sourcing (payment terms)
- [x] Add, remove, and reorder lines with the up and down buttons using only the keyboard; "Add line" disables at 50 lines; each amount and the total update as you type → AC-2
- [x] A line of `99999.99` × `9,999,999,999.99` → "The total is too large." on the lines group, nothing written, no 500 → AC-2, AC-3
- [x] A line of `0.33` × `100.01` shows `PHP 33.00` on the form, the invoice page, and the PDF → AC-3
- [x] Save → the invoice page shows "Draft", issue and due dates "Set when sent", bill to block with the primary contact name and email, lines, total, notes, history "Created" → AC-4
- [x] "Download PDF" on a draft: A4, `DRAFT` in place of the number, business block, bill to block, today and today plus terms in Asia/Manila, reference = contract title, table, total, notes, payment instructions, tax note, `Page 1 of 1`, large light DRAFT watermark; file name `invoice-draft-<first 8 of id>.pdf` → AC-6
- [x] With no profile saved, the draft PDF business block reads `[Missing: billing profile]` → AC-6
- [x] Put `₱`, `ñ`, curly quotes, and an en dash in a line; they render in the draft and sent PDF → AC-6
- [x] Edit the draft in one tab, then "Mark sent" from a stale tab → stale message, no number taken, counter unmoved, no `invoice_files` row → AC-7, AC-8
- [x] Rename the client in another tab between opening the page and confirming "Mark sent" (or change the profile) → stale message, nothing changed → AC-7, Value sourcing (render stamp)
- [x] "Mark sent" with no profile → "Complete your billing profile before sending." with a link to it → AC-7
- [x] "Mark sent" on a valid draft → number `INV-<year>-<n>` padded to 4 digits, issue date today (Asia/Manila), due date issue plus terms; download twice, both SHA-256 equal the stored `invoice_files.sha256`, file named `<number>.pdf`, no watermark → AC-7, AC-8
- [x] After sending, the edit URL redirects to the invoice page → AC-5
- [x] "Mark paid" with a date before the issue date or after today → "Choose a date from the issue date to today."; valid date with GCash and a reference → Payment section shows them → AC-9
- [x] "Undo paid" → back to Sent, payment details cleared → AC-9
- [x] "Void invoice" with no reason → "Say why this invoice is void."; with a reason → Void, keeps number and PDF, no steps → AC-9
- [x] Post a step from a stale dialog (status changed in another tab) → "This invoice's status changed. Reload to see the latest." → AC-9
- [x] Set a sent invoice's `due_on` to yesterday on the dev branch → page and lists show "Overdue", it appears under `?status=overdue` and `?status=sent`; a due date of today is not overdue → AC-4, AC-11, Value sourcing (Overdue)
- [x] "Discard draft" → leaves every list, shows under `?archived=1`, page says "Discarded on <date>" with only "Download PDF"; discard on a sent invoice is never offered and a forced post is refused → AC-10
- [ ] Contract Invoices section: billed (sent plus paid, void excluded), paid, and contract amount; client page Invoices section lists invoices with the contract title → AC-11
- [x] `/studio/invoices?status=bogus&page=abc` shows all on page 1; 25 per page; newest change first; nav has Invoices; list links to the billing profile → AC-11
- [x] Archive a contract or client that has a sent invoice → "Settle or void this contract's open invoices before archiving." / client message; drafts do not block → AC-12
- [x] A step on an invoice of an archived client → `ClientArchived` message; those pages are read only → AC-12
- [ ] Phone width (375px) and both themes on the list, invoice page, form, and dialogs: no sideways scroll, readable → AC-15

## Commands
- [x] Signed out `curl -I http://localhost:3000/studio/invoices/<id>/pdf` → 307 to `/studio/login`, no PDF bytes → AC-13
- [x] Signed in, a malformed id and another workspace's id → 404 → AC-13
- [x] PDF responses carry `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline` → AC-13
- [x] Delete the Blob file of a sent invoice on the dev store (or point the row elsewhere) → the route returns 404 and logs only `FILE_MISSING` → AC-13
- [x] Hand written SQL on the dev branch: a line with a wrong `amount_minor` is refused (`invoice_lines_amount_rule`); updating a sent invoice's notes or a line, or deleting an invoice, is refused by the triggers → AC-3, AC-5
- [x] Send three invoices, void the second, discard a fourth draft → numbers 0001, 0002, 0003, no gap, 0002 shows Void → AC-8
- [x] `npm run db:seed` twice → second run reports billing profiles and invoices "0 created" → AC-14
- [x] `npm run lint`, `npm test`, `npm run build` (leak check clean) → AC-15
- [x] On a Vercel deploy: download a draft and a sent invoice PDF with `₱` and `ñ` (proves the font tracing) → AC-6, AC-15
- [ ] Server logs during all of the above carry only action or route names and codes, never lines, profile, or client details → AC-13

## Acceptance-criteria coverage
- AC-1 profile steps · AC-2 new form, prefill, limits · AC-3 rounding, limits, SQL check · AC-4 invoice page, Overdue · AC-5 edit redirect, triggers · AC-6 draft PDF, characters, Vercel PDF · AC-7 send, stale, render stamp, no profile · AC-8 numbering, stale send · AC-9 steps · AC-10 discard · AC-11 sections, list, filters · AC-12 archive guards · AC-13 auth, headers, FILE_MISSING, logs · AC-14 seed · AC-15 states, phone, themes, lint, build, Vercel PDF
