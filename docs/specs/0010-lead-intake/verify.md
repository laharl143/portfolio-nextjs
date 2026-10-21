# Lead intake verification

Design checklist only. No acceptance check has been run and nothing here records a pass.

- [ ] AC-1: `/contact`, metadata, canonical, sitemap, Contact Me links, and alternate contact links.
- [ ] AC-2: required and optional fields, Unicode limits, labels, errors, pending state, keyboard, mobile, both themes.
- [ ] AC-3: challenge verification, exact origin, shared rate limits, same key retry and changed payload rejection.
- [ ] AC-4: save failure preserves form; email failure still confirms a saved inquiry; public response leaks no content or ids.
- [ ] AC-5: signed in inbox, search, paging, filters, empty states, detail; viewing changes no activity time.
- [ ] AC-6: valid and invalid state changes, stale versions, events, closed reopen, converted final state.
- [ ] AC-7: new and existing client conversion, existing contact, duplicate name, archived client, transaction rollback, racing retry, normal client note deletion.
- [ ] AC-8: accepted, failed, unknown and expired lease states; frozen retry payload, cooldown, safe window, duplicate risk confirmation, no visitor content in alert.
- [ ] AC-9: calendar month cutoffs, daily job authentication, incomplete batch health, cleanup versus conversion/alert, source deletion without deleting client records.
- [ ] AC-10: every owner read/action denied when signed out or in another workspace; logs, analytics, public bundle and responses contain no private values.
- [ ] AC-11: disabled and missing configuration, preview suppression, fake local providers, existing guard behavior and secret checks.
- [ ] AC-12: lint, production build and leak check; automated failure and concurrency tests; owner setup verified separately before enabling real intake.
