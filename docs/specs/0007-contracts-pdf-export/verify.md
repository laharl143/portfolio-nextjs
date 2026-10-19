# Verify: Contracts & PDF export · spec 0007 · updated 2026-10-19
_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] `/studio/templates` lists "Example service agreement" (after `npm run db:seed`), newest update first → AC-1, AC-12
- [ ] New template with `{{client.phone}}` in the body → field error "Unknown placeholder: {{client.phone}}." → AC-1
- [ ] New template named like an existing one in other case (e.g. `EXAMPLE service AGREEMENT`) → "A template with this name already exists." → AC-1
- [ ] Editor shows the placeholder list and a live preview with placeholder chips → AC-1
- [ ] Edit a template from a stale tab → "This was changed elsewhere. Reload to see the latest." → AC-1
- [ ] Archive a template → gone from the list and the new contract template picker; its edit URL shows not found; contracts made from it keep their text → AC-1
- [ ] Client page → New contract with no template and amount `12,500.555` → field errors on template and amount → AC-2
- [ ] New contract from the example template with project, amount `12,500`, billing, dates, terms → opens `/studio/contracts/<id>` as Draft with one "Created as Draft" event → AC-2
- [ ] Contract page shows amount `PHP 12,500.00`, billing, dates, terms, sent/signed dates, preview with every value filled (an empty value shows "Missing: <label>") → AC-3
- [ ] Rename the client, then reload the draft contract page → preview shows the new name (values are read at render) → AC-3, Value sourcing
- [ ] Edit page of a draft saves fields and body; an unknown placeholder in the body is a field error → AC-4
- [ ] Edit page of a sent or signed contract redirects to its page → AC-4
- [ ] Download PDF on a draft → `<slug>-draft.pdf`, A4, DRAFT watermark on every page, `Page N of M`, headings bold, lists and page break, ₱ ñ curly quotes and dashes render → AC-5
- [ ] Download PDF on a seeded active contract (sent, no frozen PDF) → `NOT THE SENT COPY` watermark on one line; on the seeded cancelled from draft contract → `DRAFT` → AC-5, Value sourcing
- [ ] Mark sent on a Blank contract → "Add the contract text before sending." and nothing changes → AC-6
- [ ] Mark sent on a template contract with no amount, dates, billing, terms, or project → "Fill these before sending: Project, Start date, End date, Billing, Amount, Terms summary." (first appearance order) → AC-6
- [ ] Mark sent from a stale page (contract edited since load) → stale message, no event, no `contract_files` row → AC-6
- [ ] Rename the client between render and commit (breakpoint or test hook in `sendContract`) → stale message, no row, Blob file deleted → AC-6 (not yet exercised)
- [ ] Mark sent with all values → status Sent, one event with the note, one `sent_pdf` row linked to it; `{{today}}` is the send date in Asia/Manila → AC-6
- [ ] Each step from `CONTRACT_TRANSITIONS` appears with a confirm dialog and optional note; `ended` and `cancelled` show none → AC-7
- [ ] Back to draft → editable again; edit; Mark sent again → two `sent_pdf` rows, files list shows "Sent on <date>, replaced" for the first, Download PDF returns the second → AC-7
- [ ] Mark signed with a PNG renamed `.pdf` → "Choose a PDF of 4 MB or less.", status still Sent → AC-8
- [ ] Choose a 4.2 MB file in the signed copy input → error shown in the browser, submit disabled → AC-8
- [ ] Mark signed with a real PDF → Signed, `signed_copy` row linked to the signed event; Add signed copy on the signed contract adds another, newest first with date and size → AC-8
- [ ] Client page Contracts section lists live contracts (title, status, amount, last change) with New contract → AC-9
- [ ] `/studio/contracts` lists live contracts with client, `?status=signed` filters, `?archived=1` shows archived only, 25 per page, nav has Contracts and Templates → AC-9
- [ ] Archive an active contract → refused (no button; a forged post gets "Only a draft, ended, or cancelled contract can be archived.") → AC-10
- [ ] Archive a draft contract → back to the client page; contract page shows "Archived on <date>" with no edit, step, upload, or archive controls; Download PDF still works → AC-10
- [ ] Archive a client in tab B while tab A has a step dialog open on its draft contract → submitting in tab A shows "This client is archived, so its contracts cannot be changed." → AC-10
- [ ] Contract and template pages show loading, error, and not found states, work at 375 px with no sideways scroll, and in light and dark → AC-13

## Commands
- [ ] `curl -I` a contract `/pdf` URL with no cookie → 307 to `/studio/login?next=…`, no PDF bytes → AC-11
- [ ] Same with a bogus session cookie → 307 from the route guard → AC-11
- [ ] `/pdf` and `/files/<id>` responses carry `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`; sent PDFs `inline`, signed copies `attachment; filename="<slug>-signed-<n>.pdf"`, sent files `<slug>-sent-<n>.pdf` → AC-11
- [ ] A file id of another contract, a malformed file id, and a malformed contract id → 404 → AC-11
- [ ] Download the sent PDF twice and compare `sha256sum` with `contract_files.sha256` → identical → AC-6, AC-11
- [ ] Server log after the run contains no contract text or client details (only `[studio] <name> failed <code>`) → AC-11
- [ ] `delete from studio.contract_files where contract_id = '<id>'` on the dev branch → "contract_files is append only (DELETE rejected)" → Key invariants
- [ ] `npm run db:seed` twice → second run reports `contract templates: 0 created, 1 already present`; seeded contracts keep an empty body → AC-12
- [ ] `npm run lint` and `npm run build` pass; leak check clean → AC-11, AC-13
- [ ] `.next/server/app/(studio)/studio/(signed-in)/contracts/[contractId]/pdf/route.js.nft.json` and `.../page.js.nft.json` list the four `NotoSans-*.ttf` → AC-13
- [ ] `npm run build` then `next start` with the dev branch env: draft PDF with ₱ and ñ renders, Mark sent freezes a PDF whose hash matches its row → AC-5, AC-13

## Acceptance-criteria coverage
- AC-1 template steps 2 to 6 · AC-2 new contract steps · AC-3 contract page and rename step · AC-4 edit steps · AC-5 PDF and watermark steps · AC-6 send refusals, stale, rename (open), success, hash compare · AC-7 steps and resend · AC-8 signed copy steps · AC-9 lists and client section · AC-10 archive steps · AC-11 auth, headers, 404s, logs · AC-12 seed · AC-13 states, lint, build, tracing, production run
