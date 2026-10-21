# Lead intake implementation plan

> For agentic workers: execute inline using the executing plans skill. The approved design is spec 0010.

Goal: public inquiries saved privately, reviewed and converted deliberately, with safe alerts and retention.

Architecture: narrow public ingestion outside the studio route group, existing Neon transaction connection, guarded studio reads and actions. Intake defaults off. Provider adapters use native fetch.

Spec: `docs/specs/0010-lead-intake/index.md`.

## Constraints

Preserve owner guards, workspace scope and full timestamp versions. Use fake local data. Never print secrets or inquiry content. Do not enable production or modify provider accounts. Preserve the uncommitted spec and scope inputs.

## Tasks

- [x] Set up the approved Vitest, Testing Library, and Playwright preferences and configuration. Write failing validation and configuration tests, implement pure intake rules, run them.
- [x] Add five inquiry tables with constraints and indexes. Generate and inspect the additive migration, apply on the development database, verify tables.
- [x] Build ingestion: exact origin, streaming body cap, trusted address HMAC quotas, challenge checks and transactional deduplication. Test denied access, retries and failures.
- [x] Build public form, contact metadata and navigation, and guarded inbox list/detail.
- [x] Build versioned status changes and atomic conversion with idempotent results, contact reuse and note preservation. Test competing conversion requests.
- [x] Build frozen alert generations and leases, guarded retries, authenticated cleanup and maintenance health. Test provider uncertainty and retention.
- [x] Run focused automated checks, lint, typecheck, production build and leak check. Run browser checks with fake inputs. Record remaining owner setup and update scope and Jira from evidence.

## Review focus

Replays must not repeat initial alerts. No saved inquiry fields may appear in public responses. Conversion must be atomic under the shared workspace lock. Cleanup must respect live leases. Preview must remain disabled.

## Execution record

Prerequisites checked: source up to date with origin/main, Node 22.23.3, npm 10.9.9, existing dependencies and development database URLs present. New intake secrets absent. Owner chose Vitest, Testing Library and Playwright. Jira DP access verified and feature mirrored without duplicates as DP-72 with DP-73 through DP-76.

Build checks: 29 unit/component/action guard tests, 10 isolated development database tests, 4 real browser checks on desktop and 375px. Migration 0009 applied; all five tables exercised through queries. Light and dark conversion screenshots inspected. Fresh context review found and rechecked two corrected issues: owner alert retry configuration must work independently of public intake, and cleanup must record partial progress on lock contention. Model independence of that review is unverified.

Provider behavior was faked in automated tests. Real Turnstile production validation, domain ownership, Resend delivery and the deployed cron still require owner setup and production verification. No provider accounts, real inboxes, secrets or production settings were changed. The feature remains in progress at Beta, awaiting the separate Verify and Test workflow closing stages. No commit or push was made.

Commands: `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run lint`, `npm run build`. Database and browser tests create isolated fake workspaces and remove them afterwards. Browser test output is ignored. Run `npx playwright install chromium` once on another machine.
