# /check verify studio home dashboard · FAIL

**Date**: 2026-10-22 · **Spec**: [0012](../specs/0012-studio-home-dashboard/index.md) · **Checklist**: [verify.md](../specs/0012-studio-home-dashboard/verify.md) · **Scope**: feature 28

**FAIL: 10 of 13 criteria met, 1 not applied (AC-10, database half), 2 blocked (AC-6 `In sync`, AC-7 `All clear`).** Every specced surface exists. The build was checked uncommitted, read from disk.

Next: decide how a database outage should look to the owner, since the guard needs the database before the page can show its health card. That is a spec question, so `/architect studio home dashboard` (AC-10) is the recommended next step, then `/develop` or `/debug` for the fix.

## Failing or owed

- **AC-10, database half: specced but not applied ⚠️.** With `DATABASE_URL` pointed at `127.0.0.1:1`, a signed in request to `/studio` returns **500**, not the red `Database not reachable` card. The server log shows `Failed query: select ... from "studio"."sessions" ...` at `src/studio/auth/session.ts:50`, so `requireStudioAccess()` throws before the page runs `getDatabaseStatus()`. The same happens with an unmigrated database (the Neon `postgres` database, which has no studio tables): 500, with `relation "studio.sessions" does not exist`. This predates the feature (at `HEAD` the signed in layout and page already called `requireStudioAccess()` first), but AC-10 as written can't show at runtime. The DOM test in `page.test.tsx` passes only because it mocks the guard. The storage half of AC-10 works (see below).
- **AC-6, `In sync` half: blocked.** `studio.systems.id` is a global primary key (slugs such as `crm`), so a fake workspace can't hold systems that match `utils/data/products-data.ts`. The only matching set is in the dev `ed-studio` workspace, which I didn't touch. `Out of date` was verified. `In sync` and its dimmed tile are covered only by `page.test.tsx`.
- **AC-7, `All clear` card: blocked**, for the same reason: every signal at 0 needs the export in sync. The dev `ed-studio` workspace has 4 sent or draft contracts, so it isn't clear either. The other half of AC-7 (`All clear` hidden while a signal fails) was observed. The card itself is covered only by `page.test.tsx`.

## Per criterion

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | met ✅ | `curl /studio` signed out: `307` to `/studio/login?next=%2Fstudio`, body has 0 matches for `What needs you` or `FAKE`. e2e AC-1 passed on desktop and mobile. |
| AC-2 | met ✅ | Strip in the order Inquiries, Contracts, Retention, Public export, hrefs `#inquiries`, `#contracts`, `#retention`, `#export`. With every contract archived, the Contracts tile stayed in second place with `data-dimmed="true"`, `opacity-60`, href `/studio/contracts`, and the `#contracts` section was gone. Grid is 4 columns at 1280px and 2 at 375px, with no horizontal scroll (`scrollWidth <= innerWidth`). |
| AC-3 | met ✅ | Seeded 4 open (new and reviewing), 1 closed, 1 in another workspace. The tile read `4 open · 3 alerts failed` (failed, unknown, and sending with an expired lease counted; sending with a live lease not counted). Rows were Alpha `5d` (with company), Bravo `3h` (no company), Charlie `23m`, each with the red `Alert failed` mark and linking to `/studio/inquiries/<id>`. `See all` goes to `/studio/inquiries`, `Check alerts` to `/studio/inquiries?alert=attention`, which listed the same 3 inquiries. |
| AC-4 | met ✅ | `2 sent · 1 draft` with the archived sent contract excluded. Rows: Sent Six `6d`, Sent Three `3d`, Draft One `1h`, each with title, client, status badge, and `/studio/contracts/<id>`. With only drafts left: `0 sent · 1 draft`, and `See all` goes to `/studio/contracts?status=draft`. Age from a status event: a contract created 10 days ago with a `draft → sent` event 26 hours ago (event rows inserted directly, not through the studio send flow, which writes a PDF to Blob) showed `1d`, title `Oct 21, 2026, 8:18 PM` (`latest_event` `2026-10-21T12:18Z`), not `10d`. |
| AC-5 | met ✅ | Eligible (archived 13 months ago) shown as `Client`, `due 30d ago`, linking to `/studio/retention/client/<id>`. The blocked client (has a contract) and the waiting one (archived 2 months ago) were not shown. `/studio/retention?state=eligible` listed the same single record. |
| AC-6 | blocked ⚠️ (half met) | `Out of date`: the tile showed `36`, section `Public export: 36 differences`, with the first 3 lines matching the `/studio/systems` banner (`Public page is out of date: 36 differences`, the same first 3 lines). `Open systems` goes to `/studio/systems`. `In sync` blocked, see above. |
| AC-7 | blocked ⚠️ (half met) | With retention failing, `All clear` was absent (0 matches). The card itself couldn't be reached with fake data. |
| AC-8 | met ✅ | Clients 2 (Lead 1, Active 1, Past 0; archived excluded). Contracts 5 (Draft 1, Sent 2, Signed 1, Active 0, Ended 1, Cancelled 0; archived excluded). `No projects yet`. Legend links `/studio/clients?status=<s>` and `/studio/contracts?status=<s>` for every status. No project links in the HTML. |
| AC-9 | met ✅ | Footer: `Connected, 12 migrations applied` and `Private store reachable` with green dots, and the seven counts on one line (`Clients 2 Contacts 1 Projects 0 Contracts 5 Notes 0 Systems 0 System links 0`). |
| AC-10 | **not applied ⚠️ (database half)**, storage half met | Storage: with a broken `BLOB_READ_WRITE_TOKEN`, the red `File storage not reachable` card renders before the strip, the strip and overview render normally, and the footer reads `Storage not reachable` in red (`storage-desktop-light.png`). Database: 500, see above. |
| AC-11 | met ✅ | I held `lock table studio.contacts in access exclusive mode` for 12s while loading `/studio`. Retention hit its 3s `lock_timeout`. The tile showed `!` with `Could not load`, the other tiles, sections, overview, and counts rendered (`200` in 8.7s), and the only server log line was `[studio] home signal retention 55P03`. No code edit was needed. |
| AC-12 | met ✅ | The signed in HTML had 0 matches for the inquiry emails (`example.invalid`), descriptions, contact email or phone, or the contract amount (`123456789`, `1,234,567.89`). The only query parameters are `?status=`, `?alert=attention`, `?state=eligible`. `npm run build` ended `[leak-check] clean: 164 files scanned for 2 studio strings`. `npm run lint` was clean. |
| AC-13 | met ✅ | After inserting a project and reloading, `No projects yet` was gone and Projects showed `1`. Archiving contracts and closing an inquiry showed up on the next load. Light and dark at 1280px and 375px: body `rgb(231,229,228)` / text `rgb(28,25,23)` light, body `rgb(28,25,23)` / text `rgb(245,245,244)` dark, no overflow. Screenshots are in [0012-studio-home-dashboard-verify/](0012-studio-home-dashboard-verify/). |

Value sourcing: ages `just now` (a row created 0s ago), `23m`, `3h`, `5d`. Tooltips are in `Asia/Manila` (a `12:18Z` event shows `8:18 PM`). Workspace isolation held: workspace A never showed the other workspace's inquiry, and the other workspace showed only its own `1 open · 1 alert failed`.

## Commands

| Command | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm test` | 15 files, 91 tests passed |
| `npm run test:db` | 3 files, 32 tests passed |
| `NO_PROXY=localhost npm run test:e2e` (`e2e/studio-home.spec.ts`) | 4 passed, but only after exporting `DATABASE_URL` into the shell. Without it, the 2 dashboard tests throw `Local development fixture only`, because Playwright doesn't load `.env.development.local`. |
| `npm run build` | exit 0, `[leak-check] clean` |

Ran via `npm run dev` on `localhost:3000` (the `portfolio-dev` launch config), with separate dev runs that overrode `BLOB_READ_WRITE_TOKEN` and `DATABASE_URL`. Signed in with a fake `studio_session` cookie, using the pattern from `e2e/studio-home.spec.ts`.

## Fake data left on the dev branch

Workspace `fake-verify-0012-p-1b77c876` (`1b77c876-593f-4166-a64e-240a67120d53`) still holds one client and one contract with two `contract_status_events`. Those rows are append only, so they can't be deleted. Its session and inquiry were removed. The main fake workspace was fully removed.

## For /check review

- `Alert failed` labels `unknown` and expired `sending` alerts too, and the tile's alert count includes alerts on closed inquiries. That matches the inbox `?alert=attention` filter, which also listed a closed inquiry with a failed alert, but the wording may surprise you.
- `verify.md` says `NO_PROXY=localhost npm run test:e2e`. The dashboard tests also need `DATABASE_URL` in the shell.
- The 375px strip wraps `4 open · 3 alerts failed` onto two lines. It reads fine, with no overflow.

---

# Re-verify after the outage screen · PASS

**Date**: 2026-10-22 · build step 8 (`studio/error.tsx`) checked uncommitted, read from disk.

**PASS: all 13 criteria met, every specced surface built.** The three items left open above are now met with runtime evidence.

| AC | Verdict | Evidence |
|---|---|---|
| AC-10, outage before the guard | met ✅ | `next dev` and `next start` on port 3200 with `DATABASE_URL` at `127.0.0.1:1`: no cookie gives `307` to `/studio/login?next=%2Fstudio`; a made up `studio_session` cookie gives `500` whose HTML holds only a digest (0 matches for `Failed query`, `sessions`, `not reachable`, `not migrated`, `What needs you`, `System health`, `<nav`). In the browser it renders `Studio is unavailable` with the fixed line and `Try again`, no nav and no detail; clicking `Try again` gave a navigation of type `reload` (a page marker was cleared). Same result on the Neon `postgres` database (server log: `relation "studio.sessions" does not exist`, page unchanged). `error.test.tsx` and `page.test.tsx`: 17 tests passed. |
| AC-6, `In sync` | met ✅ | On a throwaway database (`verify_0012_scratch` on the dev branch, migrated, 15 systems and 21 links copied from `utils/data/products-data.ts`, dropped afterwards): the tile read `0 In sync`, dimmed, linking to `/studio/systems`, with no export section. Appending text to the `crm` public summary gave `1 Out of date`, section `Public export: 1 difference`, line `CRM: public summary changed`, and `Open systems`. Restoring it went back to `In sync`. |
| AC-7, `All clear` | met ✅ | Same database, after closing the one open inquiry: `All clear` with its line, no `What needs you` strip, no sections, and the overview right below. |

Commands: `npm run build` exit 0, `[leak-check] clean: 165 files scanned for 2 studio strings`.

Not rechecked in this run (met in the first run, code unchanged since apart from the new error boundary): AC-1 to AC-5, AC-8, AC-9, AC-11 to AC-13.

For /check review: the in app browser pane would not accept a hand set `studio_session` cookie for a valid scratch session (it redirected to login), while `curl` with the same cookie got the dashboard. Likely a pane cookie quirk, not the app; the AC-6 and AC-7 evidence above is from the HTML.
