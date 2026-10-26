# /check verify invoicing · PASS (1 check blocked on a deploy)

**Date**: 2026-10-27 · **Spec**: [0013](../specs/0013-invoicing/index.md) · **Checklist**: [verify.md](../specs/0013-invoicing/verify.md) · **Scope**: feature 29

**PASS: AC-1 to AC-14 met with test evidence; AC-6 and AC-15 met locally, with the production PDF check owed on a Vercel deploy.** The build was checked uncommitted, read from disk on `main` at `bb719c5` plus the working tree (the invoicing build, Codex's logging fix and tests, and two test fixes from this run).

This record collects three runs: the build session's browser walk (2026-10-26), a Codex verify pass in this folder that fixed a logging leak (production errors no longer log SQL or parameters; its own report is not in the repo), and this rerun of every automated suite on 2026-10-27.

## Open items

- **Production PDF on Vercel: blocked.** Download a draft and a sent invoice PDF with `₱` and `ñ` on a deploy, to prove the fonts are traced into the server output (AC-6, AC-15). Needs the work committed and deployed.
- **Live server logs: not observed in this run.** Covered by `invoice-reads.test.ts` (unexpected errors become `UNEXPECTED`, not found stays 404) and Codex's fix, but no log was read during the browser run (AC-13).
- **Phone width on every screen: partly observed.** The e2e test checks no sideways scroll in both themes on the invoice page at 375px; the build session saw the other screens at phone width but there is no recorded evidence for the list, form, and dialogs (AC-15).
- **Contract and client Invoices sections in the browser: not observed.** The totals rule (void excluded) is proven by the database test; the rendered sections were not looked at in this run (AC-11).

## Per criterion

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | met ✅ | e2e: TIN `12a` and email `x@y` show the specified messages, a valid save lands on `?saved=1`. db: one profile per workspace, stale versions refused. Unit: `input.test.ts` messages and blank to null. |
| AC-2 | met ✅ | e2e: New invoice prefilled with the contract title and `150000.00`. db: creation refused on non invoiceable or archived parents; defaults from the profile. Unit: `InvoiceForm.test.tsx` keyboard reorder, remove, Add line disabled at 50; `input.test.ts` and `money.test.ts` size limits. |
| AC-3 | met ✅ | e2e: `0.33` × `100.01` shows `Total PHP 33.00`. Unit: `money.test.ts` matches the database rule on edge and sampled inputs and does not overflow at the largest inputs. db: a wrong `amount_minor` is refused. |
| AC-4 | met ✅ | e2e: Draft heading and `Created` in the history. db: ordered lines, rounded totals, one opening event; today is not overdue. |
| AC-5 | met ✅ | e2e: draft edit saves. db: after sending, `update studio.invoices set notes` and `update studio.invoice_lines set description` are refused by the triggers; a send from an old version takes no number. |
| AC-6 | met locally ✅, Vercel ⚠️ | e2e: draft PDF `200`, starts `%PDF`. db: draft values render without storing. Build session: draft PDF blocks, DRAFT watermark, `Page 1 of 1`, `₱ ñ` and curly quotes render. Vercel check blocked. |
| AC-7 | met ✅ | e2e: send with no profile shows "Complete your billing profile before sending."; a stale tab gets "This was changed elsewhere. Reload to see the latest." and the counter stays empty. db: missing profile, no lines, zero total refused with no side effects; store and render failures change nothing; changed printed data after upload refuses and removes the orphan. |
| AC-8 | met ✅ | db: simultaneous sends retry once and stay consecutive after a void and a discard; a rolled back allocation leaves no gap; a new year starts at 1. Build session: `INV-2026-0001`, two downloads matched the stored SHA-256. |
| AC-9 | met ✅ | db: date rules, one event per step, stale dialogs refused, undo clears payment details. Unit: void reason required, payment method list, paid details submitted. |
| AC-10 | met ✅ | e2e: discard returns to the contract, the page shows "Discarded on", no Mark sent, listed under `?archived=1`. db: discarded drafts reject writes. |
| AC-11 | met ✅ (sections not seen) | db: sent includes overdue, totals exclude void, 25 per page. Unit: `list-params.test.ts` invalid filters and pages fall back, Manila midnight. |
| AC-12 | met ✅ | db: a sent invoice blocks archiving its contract and client; archived parents refuse writes. |
| AC-13 | met ✅ (logs not read live) | e2e: signed out pages and PDF return `307` to login with no PDF; malformed and foreign ids `404` with no foreign text; tampered and expired sessions go to login. db: foreign workspaces can't read or write; PDF headers `private, no-store`, `nosniff`; a missing file never falls back to rendering. Unit: `actions.test.ts` denies PDF downloads before lookup. |
| AC-14 | met ✅ | db: seed reruns create no extra profiles or invoices. |
| AC-15 | met locally ✅, Vercel ⚠️ | e2e: invoice page in light and dark at desktop and 375px with no overflow. Lint, unit, db, build, and leak check below. |

## Commands (2026-10-27)

| Command | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm test` | 24 files, 167 tests passed |
| `npm run test:db` | 4 files, 49 tests passed (17 in `src/studio/invoices/workflow.db.test.ts`) |
| `e2e/invoicing.spec.ts` (dev env loaded, `NO_PROXY=localhost`) | 6 passed (desktop and mobile) on the fourth run, 2.1 min |
| `npm run build` | exit 0, `[leak-check] clean: 169 files scanned for 2 studio strings` |

The earlier e2e runs failed for reasons outside the feature: the computer went to sleep during Codex's run (`ERR_NETWORK_IO_SUSPENDED`); the expired session step broke the `sessions_expires_after_created` check; the Neon connection dropped during cleanup (`fetch failed`); and a slow server action outlasted the 5 second redirect wait.

## Test changes made in this run

- `e2e/invoicing.spec.ts`: the expired session step now moves `created_at` back as well as `expires_at`, so it no longer breaks `sessions_expires_after_created`.
- `e2e/invoicing.spec.ts`: the redirects after the stale tab edit and after discard wait up to 30 seconds, since a dev server talking to Neon can be slower than the 5 second default.

## Fake data left on the dev branch

Each e2e run leaves a `FAKE invoicing browser` workspace (and a `FAKE foreign invoice browser` one) with a discarded draft and its opening event. Those rows are append only by design, and the fixture removes only its session. The earlier partial verify left a `FAKE invoicing verify` workspace with a one day session.

## For /check review

- `e2e/invoicing.spec.ts` is written on long single lines; consider formatting it like the other specs.
- `verify.md` says `curl` against port 3000; the e2e uses 3100, and on this machine `curl` needs `--noproxy '*'`.
- The browser runner does not load `.env.development.local`; the invoicing e2e needs the dev env loaded first (as `scripts/test-inquiries-browser.mjs` does).
