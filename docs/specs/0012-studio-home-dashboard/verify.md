# Verify: Studio home dashboard · spec 0012 · updated 2026-10-22
_Steps derived from spec 0012 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

Use fake data only, on the Neon dev branch. The fixture pattern in `e2e/studio-home.spec.ts` (a throwaway workspace, owner, and session cookie) works for manual checks too.

## UI / manual
- [x] Signed out, open `/studio` → redirect to `/studio/login?next=%2Fstudio`, and the response has no strip, count, or name → AC-1
- [x] Signed in with signals waiting → four tiles in the order Inquiries, Contracts, Retention, Public export, each linking to its section → AC-2
- [x] Make one signal 0 (for example no sent or draft contracts) → its tile stays in place, dimmed, links to its full list, and its section is gone → AC-2
- [x] At 375px → the strip is 2 by 2 and the page has no horizontal scroll → AC-2, AC-13
- [x] Seed 4 open inquiries (`new` and `reviewing`), one `closed`, and one in another workspace → the tile says `4 open`, the list shows the 3 oldest by `created_at` with name, company when given, and age, and each row opens `/studio/inquiries/[id]` → AC-3
- [x] Give inquiries alerts in `failed`, `unknown`, `sending` with an expired lease, and `sending` with a live lease → the alert count includes the first three only, the matching rows show the red `Alert failed` mark, and `Check alerts` goes to `/studio/inquiries?alert=attention` → AC-3
- [x] Seed sent and draft contracts, plus one archived sent contract → the tile says `N sent · M draft` without the archived one; rows list sent first, then drafts, each oldest first; each row shows title, client name, status, and age → AC-4
- [x] Move a contract to `sent` through the studio (so a status event exists) → its age counts from that status change, not from when the contract was created → AC-4
- [x] With 0 sent contracts and at least one draft → `See all` goes to `/studio/contracts?status=draft`; otherwise it goes to `?status=sent` → AC-4
- [x] Archive a client more than 12 months ago with no blockers, and another with a contract → only the first appears, with kind, name, and `due Nd ago`, linking to `/studio/retention/client/[id]`; the count matches `/studio/retention?state=eligible` → AC-5
- [x] Change a published system's summary → the export tile says `Out of date` with the difference count, the section lists the first 3 lines, and `Open systems` goes to `/studio/systems`; export again so they match → the tile says `In sync`, dimmed → AC-6
- [x] Clear every signal (no open inquiries, no alert problems, no sent or draft contracts, nothing eligible, no export difference) → one `All clear` card replaces the strip and lists, and the overview sits right under it → AC-7
- [x] Overview → clients, contracts, and projects bars count non archived rows per status, every status is in the legend with its label and count, client and contract legend entries link to `/studio/clients?status=<status>` and `/studio/contracts?status=<status>`, the project bar has no links, and an empty entity says `No projects yet` → AC-8
- [x] Footer → `Connected, N migrations applied` and `Private store reachable`, each with a green dot, plus the seven record counts on one line → AC-9
- [x] Signed in, point `DATABASE_URL` at an unreachable host and open `/studio` → `Studio is unavailable` with `Try again`; the HTML has no owner name, nav, strip, count, `not reachable` or `not migrated` text, or error message; `Try again` reloads the page → AC-10
- [x] Same with a database that has no studio tables (for example the Neon `postgres` database) → the same outage screen → AC-10
- [x] During the outage, a request with a made up `Cookie` session value gets the same outage screen, and a request with no cookie still redirects to `/studio/login?next=%2Fstudio` → AC-10, AC-1
- [x] `npm test` covers the after guard red card (`page.test.tsx`, `Database not reachable` and `Database not migrated`) and the outage screen (`studio/error.test.tsx`, no error text, reload on retry) → AC-10
- [x] Break the Blob token → a red `File storage not reachable` card above a normal strip, and the footer says `Storage not reachable` in red → AC-10
- [x] Make one signal throw (for example a temporary bad table name in `getContractSignal`) → only that tile shows `!` and its section says `Could not load`; the rest render, `All clear` stays hidden, and the server log shows `[studio] home signal contracts <code or class>` with no row data → AC-11, AC-7
- [x] View the page source → no inquiry email, message text, phone, contract amount, or note text, and no query parameter carrying personal data → AC-12
- [x] Reload after changing a record → the dashboard shows the change at once (nothing cached) → AC-13
- [x] Toggle light and dark at desktop and 375px → readable contrast, no overflow → AC-13

## Value sourcing
- [x] Ages: rows under 1 minute say `just now`, then `Nm`, `Nh`, `Nd`; hovering an age shows the full date and time in `Asia/Manila` → Every age
- [x] Workspace: rows from another workspace never appear in any count, row, or bar → Every read
- [x] Retention: the eligible set equals the retention list's `?state=eligible` result for the same data → Retention tile
- [x] Export: the difference lines match the drift banner on `/studio/systems` → Export tile

## Commands
- [x] `npm run lint` → no errors → AC-12
- [x] `npm test` → all pass, including `page.test.tsx` and `_home/age.test.ts` → AC-1 to AC-11
- [x] `npm run test:db` → all pass, including `src/studio/data/home.db.test.ts` and the retention suite → AC-3, AC-4, AC-5, AC-6, AC-8
- [x] `NO_PROXY=localhost npm run test:e2e` → `e2e/studio-home.spec.ts` passes on desktop and mobile → AC-1 to AC-5, AC-8, AC-9, AC-12, AC-13
- [x] `npm run build` → ends with `[leak-check] clean` → AC-12

## Acceptance-criteria coverage
- AC-1: signed out step, `npm test`, e2e · AC-2: strip, dimmed tile, 375px steps · AC-3: inquiry and alert steps · AC-4: contract steps, including the status event age · AC-5: retention step · AC-6: export step · AC-7: all clear and failed signal steps · AC-8: overview step · AC-9: footer step · AC-10: database and storage failure steps · AC-11: failed signal step · AC-12: page source step, lint, build · AC-13: reload and theme steps
