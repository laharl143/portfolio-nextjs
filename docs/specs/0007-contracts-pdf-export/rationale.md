# 0007. Contracts and PDF export: rationale

## Context

Feature 23 is the second studio slice. Spec 0004 already shipped the `contracts` and `contract_status_events` tables, the allowed steps in `CONTRACT_TRANSITIONS`, and `changeContractStatus()` with its locks and one event per change. Spec 0003 provided a private Vercel Blob store (no public links) and left one question open: whether a contract PDF is stored as sent or made again each time. Spec 0006 set the screen and server action patterns this slice reuses (server rendered pages, versioned edits, the client lock, coded errors, logs without personal data).

Three forces shape the design. First, the repo is public on GitHub, so anything kept as a code file is world readable; your real contract wording should not live there. Second, a contract is a legal record: what the client received must never change because a template, a renderer, or a font changed later, and Invoicing will build on it. Third, the studio runs as normal Vercel functions next to the public site, with a 4.5 MB request limit, and the studio is off in Preview deploys, so anything that only breaks on a real deploy is found late.

Signing happens outside the app for now (e-signature is deferred). The money is pesos only today (`currency` defaults to `PHP`). The data is confidential client business data, not a regulated category. Volume is tiny (one owner, a handful of contracts a month), so render speed and storage cost are not real constraints.

If this is left undecided, the build would have to invent where templates live, whether the sent PDF is kept, and how a PDF is made, and each of those is expensive to change once real contracts exist.

## Options considered

### Option 1: Database templates in a Markdown subset, `@react-pdf/renderer`, PDF frozen in private Blob at sent (chosen)

Templates live in a `contract_templates` table you edit in the studio. Creating a contract copies the template body onto it; placeholders are filled when it is rendered. `@react-pdf/renderer` (a library that builds PDFs from React components in plain Node, no browser) renders the PDF. A draft PDF is made on demand with a watermark; marking it sent stores that PDF in the private Blob store, recorded with its hash.

**Pros**:
- Wording stays private; templates are data the CRM product can grow from.
- The sent copy is kept exactly, with a hash, so nothing can change it later.
- Pure JavaScript rendering: no Chromium binary, small cold start, works in a normal Vercel function.
- One parser feeds both the preview and the PDF, so they match.

**Cons**:
- Limited layout (no tables, images, or columns) unless the renderer grows.
- Needs a bundled font for `₱` and other non Latin 1 characters, and file tracing config that only a production build proves.
- More moving parts than regenerating: a files table, a put then transaction order, and cleanup on failure.

### Option 2: HTML templates rendered to PDF by headless Chromium

Templates as HTML (or Markdown turned into HTML) and a headless browser (Puppeteer with a serverless Chromium build) prints the page to PDF.

**Pros**:
- Full CSS layout: tables, logos, columns, anything a web page can show.
- The preview is literally the same HTML as the PDF.

**Cons**:
- A Chromium binary near the Vercel function size limit, slow cold starts, and a dependency that breaks on runtime upgrades; a lot to operate for a handful of contracts a month.
- HTML templates invite injection unless every value is escaped, and allow layouts that print badly.

### Option 3: Code file templates and a PDF regenerated on every download

Templates as files in the repo, nothing stored; each download renders the PDF fresh from the contract fields.

**Pros**:
- Least code: no templates table, no files table, no Blob writes.
- Templates are versioned in git.

**Cons**:
- The repo is public, so your contract wording is public.
- The PDF a client received can silently change when a template, font, or renderer changes; there is no record of what was sent.

### Option 4: A hosted document generation API

Send the contract data to a third party service that fills a template and returns a PDF.

**Pros**:
- Rich layouts and template designers without building a renderer.

**Cons**:
- Client names, terms, and amounts leave your systems to a third party, and a new account, key, and bill to manage.
- A network dependency on every preview and send; outages block your work.

## Rationale

Option 1 is the only one that meets both hard forces at once: the public repo rules out code file templates (Options 3, and 2 if its templates were files), and the legal record force rules out regenerating on every download (Option 3). Storing the sent PDF closes the question spec 0003 left open in favour of "stored as sent", because a contract's value is that it does not change; regenerating trades that away to save one table.

Between the two ways to make a PDF, a headless browser (Option 2) buys layout freedom you do not need yet at a high operating cost: a large binary, slow cold starts, and a part that breaks on runtime upgrades, all for a few contracts a month. `@react-pdf/renderer` runs as plain Node in the existing functions, and its layout limits match a text contract (headings, clauses, lists, signature lines). The small Markdown subset is chosen over a rich text editor because it stores as plain text, needs no client library, and its parser is small enough to own; owning it is what lets placeholder values be substituted after parsing, so client data can never turn into formatting. A hosted API (Option 4) sends confidential terms to a third party for no gain at this volume.

Filling placeholders at render time (rather than baking values into the stored body at creation) keeps the draft in step with field edits, so changing the amount updates the preview without retyping, while freezing at sent still captures the final values. Your own name and address go into the template text rather than new workspace columns, because the template is private now and Invoicing is the right time to add business details as data. The runner up for each small call: a `marked` lexer instead of the in house parser (heavier, and harder to stop values being read as Markdown); `pdfkit` instead of react-pdf (lower level, more layout code); client side uploads to Blob instead of a 4 MB server action cap (needs client tokens and more config for a rare large file).

The four slices follow Tracer Bullet: the first slice runs the riskiest path, rendering plus the Blob put plus the transaction, end to end on real tables before the rest of the screens thicken it.
