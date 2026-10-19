# Verify: Private systems map · spec 0008 · updated 2026-10-19
_Steps derived from spec 0008 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

Run them on the Neon dev branch, signed in with your passkey. Keep the import JSON outside the repo (for example in a scratch folder); never commit it.

## UI / manual
- [ ] Open `/studio/systems` → nav shows `Systems` after `Templates`; four columns in order Built, In progress, Up next, Planned; each card shows name, layer label, link count → AC-1
- [ ] Cards in a column follow sort order, then id (compare with each system's Sort order on its page) → AC-1
- [ ] Click `Archived` (`?archived=1`) → archived systems only, no sync banner; with none, "No archived systems" → AC-1
- [ ] On an empty migrated branch (or with every row removed) → "No systems yet" with Import and New system links; the export button is disabled with a message → AC-1, AC-10
- [ ] Open RoomPOS → Public part (published, name, status, layer, public summary, standalone, sort order) and Private part (summary, lessons, stack chips, repo resource opening in a new tab, imported note) → AC-2
- [ ] On a system page, "Sends to" plus "Receives from" rows equal the card's link count, each with the other system's name as a link, label, Live or Planned → AC-2
- [ ] Open `/studio/systems/does-not-exist` and `/studio/systems/BAD` → studio not found page → AC-2
- [ ] New system `test-idea` (published left off) → board tags it `Not published`, banner unchanged, export leaves it out → AC-3, AC-9, AC-10
- [ ] New system with slug `oms` → field error on slug; slug `Bad Slug` → field error → AC-3
- [ ] Edit `test-idea`: stack with blank lines and padded items → stored trimmed, blanks dropped; layer Standalone → page shows Standalone Yes → AC-3
- [ ] Open the edit form in two tabs, save in one, then save the other → "This system changed since you opened it", nothing saved → AC-3
- [ ] Switch `test-idea` published on → banner shows 1 more difference ("is not on the public page yet") → AC-3, AC-9
- [ ] Archive Helpdesk → it leaves the board, its page says archived and has no edit controls, the banner lists it and its 3 links as removed; Restore → back with links intact → AC-4
- [ ] Add a link from a system to itself, then a second link to the same target, then a link to an archived system → "A system cannot link to itself", the duplicate field error, "Restore the archived system first" → AC-5
- [ ] Edit a link's label and state; delete a link after the confirm; delete it again from a stale tab → no error (already gone counts as done) → AC-5
- [ ] Add a resource with URL `javascript:alert(1)` and `example.com` → refused; `https://example.com/docs` → saved, opens in a new tab with `rel="noopener noreferrer"` → AC-6
- [ ] Add, edit, delete a note on a system; more than 50 notes → `?notesPage=2` pages them, newest first, times in Asia/Manila → AC-6
- [ ] `/studio/systems/import`: paste the artifact JSON → Preview lists 15 systems and 21 links (Update or Unchanged), public field changes tagged `Public` → Import → counts shown → AC-7, AC-8
- [ ] Paste the same JSON again → everything Unchanged, Import writes nothing → AC-7
- [ ] Paste JSON with `status: "done"`, a row with no `id`, two rows with the same `id`, and a link to `ghost` → each listed with its path; Import stays disabled → AC-7
- [ ] Paste more than 256 KB → refused with the size message → AC-7
- [ ] Edit the textarea after a clean preview → Import disables until you preview again → AC-7
- [ ] Archive Ledger, paste the JSON → Ledger shows Skipped (archived), gains no note, its links are skipped → AC-4, AC-8
- [ ] Mapping: an artifact `ongoing` system shows In progress, `idea` shows Planned, `group` shows as the layer, `order` as sort order, `stack` split on `·` into chips → AC-8
- [ ] Banner after the dev import → lists only real differences (for example "Order changed in Planned"); change OMS status → 1 more difference → AC-9
- [ ] Click Export public file → downloads `products-data.ts`; it is a plain `<a download>` (no prefetch request in the network panel before the click) → AC-10
- [ ] At 375px width: board stacks to one column, detail, forms, and import page read well; repeat in light and dark themes → AC-12
- [ ] Signed out: open `/studio/systems`, `/studio/systems/import`, `/studio/systems/export` → login redirect, no data → AC-12

## Commands
- [ ] Copy the downloaded file over `utils/data/products-data.ts`, then `npm run lint` → passes → AC-10
- [ ] `npm run build` with that file → passes and ends with `[leak-check] clean` → AC-10, AC-11
- [ ] Search the downloaded file and `.next/static`, `.next/server/app` for a lesson's text, a note's text, and a repo URL → no match → AC-10, AC-11
- [ ] `grep -rn "studio" src/app/(site) src/sections src/components` → no import of `src/studio/` → AC-11
- [ ] Restore `utils/data/products-data.ts` afterwards unless you are doing the real production move → AC-10
- [ ] Trigger an action failure (for example stop the database URL) → server log line carries only the action name and an error code, never JSON or field values → AC-12

## Acceptance-criteria coverage
- AC-1 board, order, archived toggle, nav, empty state · AC-2 detail parts, connections, not found · AC-3 create, slug rules, stack, standalone, versioning, published default · AC-4 archive, restore, import skip · AC-5 link rules · AC-6 resources, notes, URL rule · AC-7 import preview, errors, size, rerun · AC-8 field mapping, archived skip · AC-9 drift banner · AC-10 export file and button · AC-11 no leaks · AC-12 auth, states, mobile, themes, logs
