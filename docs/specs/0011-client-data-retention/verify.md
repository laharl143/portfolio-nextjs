# Client data retention verification

Accepted by the owner on 2026-10-22 after Verify and Test passed. Scope feature 26 is done and spec 0011 is Accepted. The dated results below preserve the original verification history; the completed Test stage and final counts are recorded in `docs/scope/scope.md`.

Use fake development data only. No production removal during verification.

| Criterion | Proof to collect |
|---|---|
| AC-1 | Studio navigation, list/filter/paging, empty/error states, keyboard, both themes at 375px and desktop |
| AC-2 | Exact DB cutoff including leap day; independent contact versus archived client clocks; live converted client remains |
| AC-3 | Each hold, project, contract and source inquiry blocker; blocker disappears only through its own legitimate lifecycle |
| AC-4 | Set and release each hold reason, version conflicts, parent inheritance, held child blocking whole client |
| AC-5 | Preview exact target and related rows with all pages, counts and irreversible removal boundaries |
| AC-6 | Confirm successful removal; repeated and concurrent confirmation returns one receipt; expired or stale preview refuses; injected failure leaves all records intact |
| AC-7 | Contract/project/system/inquiry rows unchanged; existing inquiry cleanup and conversion tests remain passing |
| AC-8 | Signed out and disabled denial; other workspace and actor denial; no private text in URLs, logs, public build or receipt |
| AC-9 | Expired preview/receipt filtering, bounded cleanup and backlog, clean receipt fields and retention notice |
| AC-10 | Unit, database, browser test results plus lint, build and leak checks |

Record actual results and evidence here during `/check verify client data retention`. This design checklist is not execution evidence.

## Latest verification · 2026-10-21 · PASS after Debug

The initial failure below is resolved. All ten acceptance criteria are met by the combined runtime observations, service probes and executed automated checks recorded here. All specified routes and development schema are present. There are no missing surfaces or remaining acceptance blockers observed in this run. The separate Beta Test workflow stage remains open.

Root cause: the route level `loading.tsx` streamed a response before resource lookup could call `notFound()`. Loading is now an explicit Suspense fallback on the list page only (`page.tsx` and `_components/Loading.tsx`). Detail, preview and receipt lookups can return HTTP 404 before committing their response. Regression assertions were added to `e2e/client-retention.spec.ts` for missing client, preview and receipt URLs. Before the fix, desktop and mobile both failed with expected 404, received 200. After the fix, all four retention browser tests passed (`debug-browser.txt`).

The remaining manual checks found a second defect: the error boundary's reset callback reused a failed server payload. After the controlled database lock was released, activating Try again made zero network requests and stayed on the error screen; a full reload returned 200 and recovered. `error.tsx` now reloads the page to fetch a fresh response. Repeating the controlled read timeout on the final production build and activating Try again with Enter produced a new navigation, HTTP 200 and 50 list rows (`debug-error-final.png`, `debug-recovered.png`). Add a durable fault/recovery regression in the remaining Test stage; the runtime reproduction and successful rerun are recorded here.

Supplementary evidence, in the same scratch directory named below:

| Criterion | Completion evidence |
|---|---|
| AC-1 | Populated list, empty, filtered empty and not found screens observed at 375px and 1280px, explicitly toggling the actual dark class for both themes, with no horizontal overflow. `debug-list-*`, `debug-empty-*`, `debug-filtered-empty-*`, `debug-not-found-*`. Actual database read lock produced loading and safe error screens, with screenshots in both widths/themes (`debug-loading-*`, `debug-error-*`). Keyboard Tab moved between both filters and Filter, Enter submitted and returned 50 rows. Keyboard Space acknowledged removal, Tab reached confirmation and submit, Enter reached the receipt. |
| AC-2 | Original service evidence remains valid; no clock or data layer change. Due date displayed for independently archived contact matched its archive plus 12 calendar months. Original leap day, equality and microsecond boundary checks passed. |
| AC-3, AC-4 | Original relationship and hold probes remain valid; no eligibility or mutation changes. Eight cross-workspace read/hold/preview/confirmation attempts in both directions are recorded in `isolation-evidence.json`, with NOT_FOUND and unchanged versions/counts. |
| AC-5 | Independent contact 56e9e38a-c746-497f-9127-059d059168d5 removed through the real UI using keyboard confirmation; receipt 50b0dd4c-9c74-497d-9d45-b5acfa313fee showed 0 clients, 1 contact, 0 notes. Database query found 0 target contacts and 1 unrelated client note afterward. Four preview width/theme screenshots (`debug-preview-*`). Original 52 contact/52 note preview paging and client removal evidence remains valid. |
| AC-6 | Original stale, expiry, consent, hash, policy, rollback and concurrency probes remain valid. Updated desktop/mobile browser flow passed stale refusal followed by successful removal. Independent contact keyboard removal succeeded. |
| AC-7, AC-8 | Final built app returned 404 for invalid ID, other-workspace client, unknown preview and unknown receipt, while rendering Retention record not found. Other-actor preview 50861c74-6618-4cce-9509-da17908c4d84 and foreign receipt returned 404, with no private target content (`debug-other-actor-404.png`). Relationship preservation probes and existing inquiry tests remain passing. |
| AC-9 | Original cap, expiry, receipt privacy and workspace cleanup probes remain valid. Policy and receipt notices observed in the real UI. |
| AC-10 | `npm test`: 69/69 (`debug-unit.txt`). Retention browser regression suite: 4/4 (`debug-browser.txt`). `npm run test:db`: 23/23 from the preceding verification, with unchanged data layer (`database.txt`). Application ESLint completed with exit 0; targeted final changed files also exit 0. Final `npm run build` exit 0, including TypeScript and leak check (164 files, 2 configured studio strings); local database passwords are absent from build env by project convention (`debug-build-final.txt`). Fresh schema check: PASS, 24 retention columns and constraints. |

Expected diagnostics from injected lock timeouts and failed 404 requests were observed. A transient database WebSocket failure in the shared session lookup was also observed during the session; restarting the local verification server restored access. No authentication change was made. Development React streaming script warnings were emitted during browser testing; the flows still passed. These observations are retained rather than represented as a clean console run.

Closing state: Scope Verify is checked; Test remains unchecked; feature and spec stay In Progress. The source checks below are checked where fully exercised across both verification runs. Fake verification workspaces and sessions were removed and local servers stopped. No production migration, removal, commit or push was performed. Suggested next action: `/test client data retention`, including a durable retry regression and explicit cross-workspace HTTP assertions.

## Initial runtime verification · 2026-10-21 · FAIL (resolved above)

Executed the local built app on ports 3200 (enabled) and 3201 (disabled), using isolated fake workspaces on the development database. No application code changed during this check. Evidence directory: `C:/Users/EdDuenas/.codex/visualizations/2026/10/21/01a15c4e-2a3c-7c61-891c-5c675dbc27b1/retention-verify/`.

**Confirmed failure:** the API contract requires HTTP 404 for unknown or other-workspace record/preview URLs. Actual browser navigation and independent HTTP GET returned **200**, while rendering “Retention record not found”. Observed at `/studio/retention/client/184a35f5-4b44-47d9-8ec4-9c2551469d52` as the other workspace owner and at `/studio/retention/previews/45bac494-3978-4e9d-83f8-40b52b933e54` as another actor. No private target text appeared; responses had private/no-store and noindex headers. Evidence: `other-workspace-not-found.png`, `other-actor-preview.png`. Route conformance fails; this observation does not demonstrate a data leak. Next: `/debug client data retention`.

| Criterion | Observed result and evidence |
|---|---|
| AC-1 | Partial: list 50+9 rows, kind/state filters, invalid filter defaults and page clamping, filtered empty rendered. Receipt at 375px had no horizontal overflow (`receipt-light.png`, `receipt-dark.png`; emulated color schemes). Complete loading/error/empty-state, theme and keyboard matrix not exercised; remains unverified. |
| AC-2 | Met for exercised clocks: actual service/database probes confirmed leap-day calendar addition, equality, one-microsecond-before boundary, live client and independent-contact behavior; `service-evidence.json` group 1. |
| AC-3 | Met for exercised blockers: contract, project, source inquiry reject preview; child hold blocks client until explicitly released in UI. `service-evidence.json` groups 2–3. |
| AC-4 | Met: all four hold reasons set/released, eight reason-coded audit events, inherited hold, archive clock preserved, microsecond stale version rejected. `service-evidence.json` groups 3–4. |
| AC-5 | Partial: real preview showed exact 52 contacts and 52 notes, 50 then 2 per section, independent paging preserved (`preview-second-pages.png`). Actual client removal receipt matched database removal: 1 client, 52 contacts, 52 notes. Independent-contact removal boundary was not separately driven manually. |
| AC-6 | Met for exercised safeguards: invalid posted consent denied (`server-consent-denied.png`); actual UI removal reached receipt 65218d6c-b90c-463e-843e-6cddece8f074. Service probes proved 600-second preview, full precision stale versions, policy/hash refusal, expiry, concurrent retry returning one receipt and transaction rollback; `service-evidence.json` groups 4–7. Automated browser tests independently passed the stale-preview flow. A separate manual stale attempt was inconclusive because mutation completion was not awaited before confirmation; it is not counted as stale-refusal evidence. |
| AC-7 | Relationship records remained (1 contract, 1 project, 1 source inquiry); rollback retained all fake target rows; service groups 2, 7, 10. Not-found UI concealed target content, but required HTTP 404 failed as detailed above. Broader immutable history unchanged behavior relies on the existing automated checks rather than a manual rewrite attempt. |
| AC-8 | Signed-out redirected to login (`signed-out.png`); disabled app returned 404; other workspace/actor saw no private content. URLs and receipt contained identifiers/counts only. Early browser console capture had zero errors/warnings. Full log/public-bundle privacy reinspection not repeated; prior build leak check passed during Develop. |
| AC-9 | Met for exercised metadata: expiry refused, 1,000-row cleanup cap and workspace isolation proved with 1,001-row backlogs, clean reason/count receipts and 12-month receipt notice observed; service groups 3, 5, 6, 8. |
| AC-10 | Fresh `npm test`: 69/69; `npm run test:db`: 23/23; retention Playwright desktop/mobile: 4/4; logs `unit.txt`, `database.txt`, `browser.txt`. Fresh `node scripts/check-retention-schema.mjs`: PASS, 24 columns plus constraints. Lint, TypeScript, production build and leak check passed during Develop; not rerun in this verification stage. |

Surfaces: list, target review, hold action, preview, confirmation and receipt all executed; development schema applied. Unknown/foreign target and preview responses are built but fail the specified HTTP status contract. No missing surface was established. Remaining manual coverage gaps above prevent full acceptance independently of the confirmed failure.

Scope: Verify and Test remain unchecked; spec stays In Progress. All source checklist boxes remain unchecked because the overall verdict is FAIL. Temporary fake workspaces, owners and sessions were removed after verification; immutable contract history was checked absent before fixture cleanup. Local verification servers stopped. No production migration or removal was run.

## Source checks

- [x] AC-8: Use two fake workspaces and owner sessions. Attempt each other's record and preview URLs and actions. Expect no private data or mutation; workspace and actor come from the verified session.
- [x] AC-1, AC-5, AC-6: Compare displayed names and notes with fake database rows. Change a row after preview creation and expect stale preview refusal, without deleting the changed records.
- [x] AC-2: Compare displayed due dates with the UTC database archive timestamp plus 12 calendar months. Check leap day, just before expiry, and equality. Live converted clients stay ineligible; views and hold changes preserve archive timestamps.
- [x] AC-3, AC-4, AC-7: Set and release each hold reason, test inherited client and child holds, and create each relationship blocker. Expect the same blocker state in list, review, and preview creation, with related records preserved.
- [x] AC-5, AC-6, AC-7: Compare preview row IDs and counts with the exact client, contact, and note relationships. Remove an independent contact and confirm unrelated client notes remain. Compare committed receipt counts with actual deletion counts.
- [x] AC-6: Change a full precision database version without rounding it through JavaScript Date. Expect the old preview or hold version to fail.
- [x] AC-6: Create a preview through the action and inspect its server UUID, database expiry, and actor binding. Expire or forge it and expect safe refusal.
- [x] AC-6: Omit the acknowledgement or use a different confirmation word in the posted form. Expect no mutation; both consent values must come from explicit form inputs.
- [x] AC-6: Change a fake preview's policy version or snapshot hash. Expect refusal and a fresh preview requirement.
- [x] AC-6, AC-9: Retry the same confirmed preview, including concurrent requests. Expect the same persisted receipt UUID and counts, with no further removal. An expired receipt cannot authorize success.
- [x] AC-4, AC-9: Compare hold audit reason codes with the posted set choice and the locked previous reason on release. No free text or personal content appears in the event.
- [x] AC-1: Vary kind, state, and page filters, including invalid values and an oversized page. Expect totals, rows, and page clamping from the same database eligibility predicate.
- [x] AC-8, AC-9: Create expired fake previews and receipts, including a backlog above 1,000. Expect workspace scoped bounded cleanup, expired records unavailable immediately, and no private content in receipts, URLs, or logs.
