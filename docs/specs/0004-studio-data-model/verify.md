# Verify: Studio data model · spec 0004 · updated 2026-10-19
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Run these against a fresh Neon dev branch where you can (`neon-postgres-branches`), so test rows never touch the shared dev data. If you use the shared dev branch, clean up afterwards: the append only trigger has to be disabled just for the cleanup, then turned back on.

## UI / manual
- [ ] With `STUDIO_ENABLED=true`, open `/studio` → the database line reads `Connected, N migrations applied`, where N equals the number of `.sql` files in `drizzle/` (5 today) → AC-1
- [ ] On the seeded dev branch, `/studio` shows, in this order: Clients 3, Contacts 4, Projects 3, Contracts 3, Notes 5, Systems 15, System links 21 → AC-8, AC-7
- [ ] On a migrated branch with no seed, every count reads 0 → AC-8
- [ ] On a branch with no migrations (or with `DATABASE_URL` unset), the counts are hidden and only the status lines show → AC-8
- [ ] Make the counts query fail (for example, rename `studio.notes` on a scratch branch) → the counts are hidden, the database line still shows, no error text on the page → AC-8
- [ ] `/products` renders exactly as before → AC-9

## Commands
- [ ] `npm run db:migrate` on a fresh branch → every table in the sketch exists in schema `studio`; check `information_schema.tables`, `pg_constraint` (named checks, `contracts_project_client_fk`), `pg_indexes` (42 studio indexes, including the partial uniques), and `pg_trigger` (`contract_status_events_append_only`) → AC-1
- [ ] `select * from studio.workspaces` with no seed → one row, id `00000000-0000-4000-8000-000000000001`, slug `ed-studio` → AC-2
- [ ] `npm run db:seed` → logs the target host first, then created counts; the walked contract (`…0401`) has 4 events: none to draft, draft to sent, sent to signed, signed to active → AC-3, AC-7
- [ ] Run `npm run db:seed` again → every line says `0 created`, `contract status steps applied: 0`, and no `updated_at` changes → AC-7
- [ ] On a scratch branch, put a seeded contract back partway (insert the walk only up to `sent`), rerun the seed → it resumes from `sent` and finishes at `active` → AC-7 (Value sourcing: lifecycle walk)
- [ ] `VERCEL=1 npm run db:seed` and `VERCEL_ENV=preview npm run db:seed` → both refuse → AC-7
- [ ] `STUDIO_PROD_DB_HOST=<dev host> npm run db:seed`, then the same with the `-pooler` host → both refuse → AC-7
- [ ] `createContract()` for a seeded client → status `draft`, `workspace_id` copied from the client, one opening event with empty `from_status`; title trimmed, currency trimmed and uppercased → AC-2, AC-3
- [ ] `createContract()` with a fractional amount, a lowercase two letter currency, or an end date before the start → `INVALID_CONTRACT_INPUT`; with another client's project → `PROJECT_NOT_FOUND` → AC-3
- [ ] `changeContractStatus()` draft to active, and draft to draft → `INVALID_CONTRACT_TRANSITION`, status and events unchanged → AC-3
- [ ] `changeContractStatus()` with a blank note → the event note is null → AC-3 (Value sourcing: event row)
- [ ] From `sent`, run to `signed` and to `draft` together with `Promise.allSettled` → exactly one succeeds, the other gets `CONTRACT_STATUS_CONFLICT` or `INVALID_CONTRACT_TRANSITION`, exactly one new event → AC-4
- [ ] `archiveClient()` on a client with a signed or active contract → `CLIENT_HAS_LIVE_CONTRACTS`; `archiveContract()` on a signed contract → `CONTRACT_NOT_ARCHIVABLE` → AC-6
- [ ] Archive a cancelled contract twice → the second call returns the same `archived_at`; then `changeContractStatus()` on it → `CONTRACT_ARCHIVED` → AC-3, AC-6
- [ ] Raw SQL `update` and `delete` on `studio.contract_status_events` → the trigger raises `append only` → AC-6
- [ ] `delete from studio.clients` on a client with contacts → foreign key error → AC-6
- [ ] Raw SQL inserts, each rejected by its named constraint: duplicate client name in another case, a bad status, a blank name, a second primary contact, a duplicate email in another case, a contract with another client's project, a negative amount, currency `php`, end before start, a note with two targets and with none, a self link, a duplicate link, a second opening event, an event with equal from and to → AC-5
- [ ] Insert a second workspace with a client and a contract by SQL → no count changes; `changeContractStatus()`, `archiveClient()`, and `createContract()` on those rows → `*_NOT_FOUND` → AC-2
- [ ] Archive a client → the Clients count drops by one; its contacts and projects still count until each is archived itself → AC-8 (Value sourcing: each count)
- [ ] `npm run build` → ends with `[leak-check] clean` → AC-9
- [ ] `git diff utils/data/products-data.ts` is empty, and nothing outside `src/studio/`, `src/app/(studio)/`, and `scripts/` imports `src/studio/data` or `src/studio/db` → AC-9
- [ ] No new variable in `.env.example`, no secret and no real client data in the diff → AC-10

## Acceptance-criteria coverage
- AC-1: migrate on a fresh branch, shell database line
- AC-2: workspace row, createContract copies workspace, other workspace invisible
- AC-3: walked events, invalid steps, archived contract, blank note
- AC-4: the race
- AC-5: the raw SQL rejections
- AC-6: archive rules, trigger, foreign key restrict
- AC-7: seed, rerun, resume, guards
- AC-8: counts seeded, empty, hidden, after archive
- AC-9: leak check, products unchanged, import boundary
- AC-10: no new env var, no secrets or real data
