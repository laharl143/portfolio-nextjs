# Lead intake verification

`/check verify` on 2026-10-21 (rerun after the AC-10 search fix): PASS. An earlier run that day failed AC-10 (search terms in the `/studio/inquiries?q=` URL and request log). Ticked boxes were exercised and passed against the running app or by the named suites.

- [x] AC-1: `/contact`, metadata, canonical, sitemap, Contact Me links, and alternate contact links.
- [x] AC-2: required and optional fields, Unicode limits, labels, errors, pending state, keyboard, mobile, both themes.
- [x] AC-3: challenge verification, exact origin, shared rate limits, same key retry and changed payload rejection.
- [x] AC-4: save failure preserves form; email failure still confirms a saved inquiry; public response leaks no content or ids.
- [x] AC-5: signed in inbox, search, paging, filters, empty states, detail; viewing changes no activity time.
- [x] AC-6: valid and invalid state changes, stale versions, events, closed reopen, converted final state.
- [x] AC-7: new and existing client conversion, existing contact, duplicate name, archived client, transaction rollback, racing retry, normal client note deletion.
- [x] AC-8: accepted, failed, unknown and expired lease states; frozen retry payload, cooldown, safe window, duplicate risk confirmation, no visitor content in alert.
- [x] AC-9: calendar month cutoffs, daily job authentication, incomplete batch health, cleanup versus conversion/alert, source deletion without deleting client records.
- [x] AC-10: every owner read/action denied when signed out or in another workspace; logs, analytics, public bundle and responses contain no private values.
- [x] AC-11: disabled and missing configuration, preview suppression, fake local providers, existing guard behavior and secret checks.
- [x] AC-12: lint, production build and leak check; automated failure and concurrency tests; owner setup verified separately before enabling real intake.

## Verify fixes (spec 0010 build plan step 5) · updated 2026-10-21
_Added by /develop after the verify fixes landed. `/check verify` runs these; `/test` locks the durable ones._

### UI / manual
- [x] Start the dev server with intake enabled on a FAKE workspace, Cloudflare test keys (`1x00000000000000000000AA` site key, `1x0000000000000000000000000000000AA` secret), `INQUIRY_ALERT_TO=delivered@resend.dev`, and, behind a proxy, `NODE_USE_ENV_PROXY=1` with `NO_PROXY=localhost,127.0.0.1` → `/contact` renders the Turnstile widget with Success → AC-11
- [x] In a real browser, fill name, email, description, tick the acknowledgement, Send inquiry → on screen success confirmation; DB has the inquiry (`new`), a `submitted` event, and its alert row → AC-2, AC-3, AC-4
- [x] Remove the FAKE workspace, owner, and inquiry afterwards (delete its `inquiry_rate_windows` row before the workspace, the foreign key blocks it otherwise) → zero fixture rows left → AC-11

### Commands
- [x] `npm test` → challenge reply matrix green: testing reply accepted outside production with the test secret, rejected in production; wrong action or hostname, `success: false`, non 200, malformed JSON, and timeout rejected in both → AC-3, AC-11
- [x] `npm run test:e2e` (with `NO_PROXY=localhost`) → 6 of 6, including the inbox search test on desktop and mobile; warm the routes or rerun once if the first cold compile times out → AC-10, AC-12

### Value sourcing
- [x] Challenge acceptance: vary `production` and the secret; a `result_with_testing_key` reply passes only outside production with the test secret → AC-3, AC-11

## AC-10 search fix (from /debug) · added 2026-10-21
_The inbox search form now posts to `searchInquiriesAction`, which keeps the term in the httpOnly `studio_inquiry_q` cookie (path `/studio/inquiries`, 30 minutes, cleared by an empty search). Only status, alert, and page stay in the URL._

### UI / manual
- [x] Signed in on a FAKE workspace with two fake inquiries, search by a visitor name, then by a full email → only the match is listed, the address bar stays `/studio/inquiries` (plus status or alert when set), and the search box keeps the term → AC-5, AC-10
- [x] The dev server request log for those searches shows only `POST /studio/inquiries` and `GET /studio/inquiries` lines; grep the log for the term → zero hits → AC-10
- [x] An old bookmark like `/studio/inquiries?q=<term>` is ignored (lists everything, term not echoed); an empty search clears the filter; paging links carry no `q` → AC-5, AC-10

### Commands
- [x] `npm test` → `searchInquiriesAction` denies a signed out POST before storing anything, redirects with status and alert only, and clears the cookie on an empty search → AC-10
