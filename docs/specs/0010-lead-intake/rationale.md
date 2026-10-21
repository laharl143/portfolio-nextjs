# Lead intake reasoning

## Context

The public portfolio generates interest while the private studio already tracks clients and contracts. A prospective client needs a simple way to describe a project, and the owner needs to review it before treating it as a business relationship. The studio serves one owner and public data must remain separate from private contact details.

Feature 25 uses Tracer Bullet and Beta rigor. The owner selected the core product behavior and delegated remaining recommended design choices on 2026-10-21. This record is a design, not a claim that the feature is built, tested, legally certified, or deployed.

## Options considered

### Option 1: Email link only

The simplest experience keeps the existing contact links and handles inquiries in email. It needs no new database write path, but cannot provide the requested private inbox and deliberate conversion workflow. Suitable as a fallback, not the selected feature.

### Option 2: Inquiry inbox in the current app

Store inquiries separately, expose a narrow public write endpoint, and let the owner convert them using current studio conventions. This reuses the existing database, session, and client model. It also makes the public input boundary and notification failure handling the project's responsibility. This is the recommended option.

### Option 3: Hosted form or CRM

A hosted product can offer spam filtering, inboxes, and notifications with less custom code. It adds another store of contact data and an integration back to the studio. The requested source of truth is the private studio, so a second CRM is unnecessary for this scale.

## Rationale

Inquiry and client are different stages. Creating clients automatically would couple spam and name collisions to existing client rules. An explicit conversion transaction can link repeat visitors to existing clients without overwriting their records.

The database is the primary success condition. Email alerts contain only a private link and are attempted after commit. This prevents mail failure from losing the inquiry and reduces personal information copied into the provider and mailbox. Resend is selected for its focused HTTP API and retry key support. A custom SMTP integration is the runner up, but brings more connection and retry behavior into application code.

Turnstile verifies the browser challenge server side. Database counters provide limits shared across server instances without another data service. Honeypot only protection is simpler but too weak for an internet facing submission endpoint. A dedicated rate service would be reasonable at larger volume but is not required for this owner workflow.

The cleanup job implements the owner's 12 month inactivity choice. It uses calendar months and database time rather than local browser time. This is a product retention policy, not a legal conclusion. Retention of converted client/contact/note data remains governed separately.

Provider accounts, verified domain, recipient mailbox, and secrets belong to release setup. The spec chooses interfaces without inventing account values. It does not create accounts, buy a domain, change sharing, or deploy anything.

## Design record

No References section was requested; the recommended clean format was selected under the owner's delegation. Current official provider documentation was checked for server validation, email retry window, owned sender domain, and daily cron feasibility. The spec states these operational constraints without claiming independent model review before it runs.

The data model and final design were ratified through the owner's explicit authorization to use recommended choices until this architect run completes on 2026-10-21. The feature is not built, so its spec remains Proposed. No application code or deployment configuration was changed.

## Cross check

A fresh context agent performed a read only critique. A different model could not be verified. It identified nine decision gaps, and the main thread applied their recommended resolutions under the owner's delegation: nullable note provenance preserving existing note deletion; stable conversion retry keys and hashes; exact trusted address header; complete maintenance schema and health semantics; alert version and attempt timestamps; quota rollback with duplicate insertion; a Unicode safe body cap; cleanup protection for live email leases; and a deterministic conversion note template.

Optional discovery identified the official Resend sending skill and a Cloudflare setup oriented Turnstile skill. These are recorded for implementation, not installed during the design. Provider MCP account access is not required by the app design.

A second focused read checked those fixes and found two additional compatibility details. Public field limits now match existing UTF-16 studio validation, and completed conversion retries resolve their stored result before live client validation, so later client archival does not break a successful retry. Both recommendations were applied. No application test result is implied by a design review.

## Amendment 2026-10-21: Cloudflare test keys versus the strict challenge check

`/check verify` found that the spec asked for two things that cannot both hold. Local intake must use Cloudflare's test secret `1x0000000000000000000000000000000AA`, and every reply must carry action `lead_intake` and the configured hostname. Cloudflare answers the test secret with `{"success":true,"hostname":"example.com","metadata":{"result_with_testing_key":true}}` and no action (checked live during verify), so every local UI submit returned `403 CHALLENGE_FAILED`.

Options weighed:

1. **Accept the testing reply outside production only (chosen).** `verifyChallenge` accepts `success` plus `result_with_testing_key` when `config.production` is false. Production keeps the strict check and also rejects any testing reply. The real network call to Cloudflare still runs locally, so timeout, non 200, and malformed reply handling are exercised for real. The loosened rule cannot reach production: config already refuses test secrets there, and the reply check refuses the testing flag a second time.
2. **A real Turnstile widget restricted to localhost.** The strict check would pass unchanged, but it needs a Cloudflare account and a real secret on every developer machine, which breaks the spec's rule that local verification uses provider test behavior and fake values only (AC-11).
3. **Stub siteverify in development.** Simplest, but the local submit would never touch Cloudflare, so the network failure paths would only be covered by unit tests, and a stub switch is one more thing that could be left on.

Cross check (another model, read only, 2026-10-21) asked for three precisions, all applied: the relaxed branch still requires `response.ok`, reads the testing flag defensively, and also requires the test secret in config; the matrix tests live in `src/inquiries/ingest.test.ts`. Two other concerns did not hold up against the code: the local route already injects the test address `192.0.2.1`, and `getPublicIntakeConfig` disables intake on preview and on a production build without `VERCEL_ENV`, so the relaxed branch cannot run there.

Tradeoff accepted: the action and hostname checks are not exercised by a live local submit. Unit tests with a stubbed reply cover them in both modes instead.

The same verify run found that the browser test at `e2e/lead-intake.spec.ts:65` times out after Confirm conversion: `toHaveURL` waits the default 5 s while the dev server compiles `/studio/clients/[id]` for the first time (about 10 s by hand). This is test timing, not app behavior, so only that one expectation gets a 30 s timeout. Raising the global expect timeout was rejected because it would hide real slowness elsewhere. Harness note for whoever runs it: when `HTTP_PROXY` is set, Playwright's webServer probe needs `NO_PROXY=localhost`.

## Amendment 2026-10-21: inbox search term out of the URL

The second `/check verify` failed AC-10: inbox search sent the term as `/studio/inquiries?q=…`, so a visitor's name or email landed in the server request log. The spec's interface table listed `q` as a URL input, which contradicted its own rule that visitor fields never enter query strings. The fix from `/debug` posts the search to `searchInquiriesAction` and keeps the term in a short lived, `httpOnly`, `sameSite: strict` cookie scoped to `/studio/inquiries`. The spec now matches that code. Tradeoff accepted: a search can no longer be bookmarked or shared as a link, and an old `?q=` link is ignored. That is acceptable for a private single owner inbox. A POST body or the owner's own browser cookie is not written to request logs, which is the property AC-10 needs.
