# 0004. Studio data model: one relational `studio` schema, scoped by workspace

**Date**: 2026-10-19
**Status**: Accepted

## Summary

This spec defines the records your private studio keeps: client companies, their contacts and projects, contracts with a full status history, a timestamped notes log, and your systems map with its links and private resources. Every record carries a `workspace_id` (a pointer to the business that owns it) from day one, so the studio can grow into your CRM and Invoicing products without a breaking migration. Records are archived, never deleted, and the database itself enforces the rules that must always hold. Feature 20 ships the tables, a clearly fake seed, the contract lifecycle function, and a row count on the `/studio` shell; the screens come in features 22 to 24.

## Requirements

**User stories**:
- As Ed, I want the studio's core records in place and proven end to end, so that client tracking, contracts, and the systems map each build on a real model instead of inventing one.
- As Ed, I want the contract lifecycle enforced in one place, so that a contract can never skip a step and every change is on record.
- As Ed, I want the model shaped for many businesses from the start, so that turning the studio into my CRM and Invoicing products never needs a breaking migration.
- As Ed, I want a fake seed, so that I can work on the studio without real client data ever touching the repo or a preview branch.

**Acceptance criteria**:
- **AC-1**: `npm run db:migrate` on a fresh Neon dev branch creates every table in the data model sketch, all in the Postgres schema `studio`, with the columns, nullability, defaults, foreign keys, check constraints, and indexes listed there. The shell's database line then reads `Connected, N migrations applied`, where N equals the number of migration files in `drizzle/`.
- **AC-2**: Every table except `workspaces` has `workspace_id uuid not null` referencing `studio.workspaces`. A migration inserts your workspace with the fixed id `STUDIO_WORKSPACE_ID` (below), so it exists in every environment, including production with no seed. `getWorkspaceId()` (async, `Promise<string>`) returns that id. Every top level insert takes `workspace_id` from it, a child row copies the `workspace_id` of the parent row it just loaded, and every read the data layer runs filters by it.
- **AC-3**: The allowed contract steps are exactly: draft → sent, sent → draft, sent → signed, signed → active, active → ended, and draft, sent, or signed → cancelled; `ended` and `cancelled` are final. `changeContractStatus()` rejects any other step (including a step to the current status) with an `InvalidContractTransition` error, and rejects an archived contract with `ContractArchived`; either way it changes nothing. A valid step updates the contract and inserts one `contract_status_events` row (from, to, time, optional note) in the same transaction. `createContract()` inserts the contract as `draft` plus a first event with an empty `from_status` and `to_status` `draft`, also in one transaction.
- **AC-4**: When two changes race on one contract, exactly one wins and exactly one event is written. `changeContractStatus()` locks the contract row (`select ... for update`) and updates only while the status still equals the one read. The loser gets `ContractStatusConflict` (status changed under it) or `InvalidContractTransition` (it read after the winner committed and its step is no longer allowed), and writes no event.
- **AC-5**: The database rejects bad data on its own:
  - a status or kind value outside its list;
  - a second client with the same name, ignoring case, among clients in the workspace that are not archived;
  - a second primary contact for one client;
  - a duplicate contact email within one client (ignoring case);
  - a contract whose project belongs to a different client;
  - a note attached to anything other than exactly one record;
  - a negative amount, or a currency that is not three capital letters;
  - a system linked to itself, or a second link with the same from and to;
  - an end date before its start date;
  - an empty or blank client name, contact name, contract title, or note body;
  - a second "none → draft" event for one contract, or an event whose from and to are the same.
- **AC-6**: Clients, contacts, projects, contracts, and systems are archived (`archived_at` set), never deleted. Foreign keys restrict deletes, so a client with contacts, projects, contracts, or notes cannot be hard deleted. `archiveClient()` refuses with a `ClientHasLiveContracts` error while the client has a contract in `signed` or `active`. `archiveContract()` refuses unless the contract is `draft`, `ended`, or `cancelled`. Contract status events are never updated or deleted: a trigger rejects any `update` or `delete` on `contract_status_events`. Archiving does not cascade (an archived client's contacts, projects, and finished contracts keep their own `archived_at`), archiving an already archived row returns it unchanged, and there is no unarchive in this feature. `archiveClient()` and `changeContractStatus()` both lock the client row first, so a contract cannot become `signed` while its client is being archived.
- **AC-7**: `npm run db:seed` fills the dev branch with clearly fake records, and its second run changes nothing:
  - 3 fake client companies named with `Example`, `Sample`, or `Demo`, each with contacts (emails at `example.com`), a project, notes, and contracts;
  - one contract walked draft → sent → signed → active through `changeContractStatus()`, one left in draft, one cancelled (draft → cancelled, with a note);
  - the 15 systems and their 21 links copied from the public `utils/data/products-data.ts`, with the private fields left empty.

  The seed refuses to run when `VERCEL` or `VERCEL_ENV` is set, or when the host of `DATABASE_URL` or `DATABASE_URL_UNPOOLED` (with any `-pooler` suffix removed) equals `STUDIO_PROD_DB_HOST`. It prints the host it is about to write to before writing.
- **AC-8**: When the database is connected and migrated, the `/studio` shell shows one count per entity (clients, contacts, projects, contracts, notes, systems, system links). Each count covers the current workspace and excludes archived rows. On an empty migrated branch every count reads 0. When the database is not connected or not migrated, or the counts query fails (for example a migration newer than the database), the counts are hidden and only the database status line shows.
- **AC-9**: Private system fields (`summary`, `lessons`, `stack`, `system_resources`, notes) never reach the public site. `utils/data/products-data.ts` and `/products` are unchanged by this feature, no file outside `src/studio/`, `src/app/(studio)/`, and `scripts/` imports the new data layer, and `npm run build` still ends with `[leak-check] clean`.
- **AC-10**: No secret and no real client data is in the repo. This feature adds no new environment variable; `STUDIO_WORKSPACE_ID` is a code constant, not a secret.

## Decision

**Chosen option**: Option 1: One relational `studio` schema, every record scoped by `workspace_id`, rules enforced in the database, lifecycle in one server function

Feature 20 adds the eleven tables below to the existing `studio` schema through Drizzle, scoped by a single fixed workspace until login (feature 21) maps a session to a workspace, plus a rerunnable fake seed, the contract lifecycle and archive functions, and per entity counts on the shell.

**Implementation skills**: `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) for the schema, check constraints, partial unique indexes, and `drizzle-kit generate` · `neon-postgres` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres/`) for transactions on the WebSocket driver · `neon-postgres-branches` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres-branches/`) for testing on a fresh dev branch

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Conventions for every table** (unless the row says otherwise): lives in `pgSchema("studio")`; `id uuid primary key default gen_random_uuid()`; `workspace_id uuid not null` references `workspaces(id)` on delete restrict; `created_at timestamptz not null default now()`; `updated_at timestamptz not null default now()`, set on every update by the data layer (Drizzle `$onUpdate`); status and kind columns are `text not null` with a check constraint listing the allowed values, typed as a TypeScript union in Drizzle; every foreign key is `on delete restrict` and has an index; dates of a period (`start_date`, `end_date`) are `date`, moments are `timestamptz`; every check, index, and foreign key has an explicit name (e.g. `clients_status_check`, `clients_workspace_name_uq`) so tests can assert on it; required text columns that a person types (`name`, `full_name`, `title`, `body`, `label`) carry a check `length(trim(col)) > 0`, and the data layer trims them before writing. The allowed value lists live once, as `as const` arrays in `src/studio/db/constants.ts` (a plain module imported by relative path, no `server-only`, since drizzle-kit loads `schema.ts`); both the check constraints and the TypeScript unions are built from them. `project_systems` also carries `workspace_id`.

**Data model sketch**:

| Table | Columns (beyond the conventions) | Keys and constraints |
|---|---|---|
| `workspaces` | `name text not null`, `slug text not null`. No `workspace_id`. | `slug` unique. One row inserted by migration: id `STUDIO_WORKSPACE_ID`, name `ED Studio`, slug `ed-studio`. |
| `clients` | `name text not null`, `status text not null default 'lead'` in (`lead`, `active`, `past`), `website text null`, `industry text null`, `archived_at timestamptz null` | Unique index on (`workspace_id`, `lower(name)`) where `archived_at is null`. Index on (`workspace_id`, `status`). |
| `contacts` | `client_id uuid not null` → `clients`, `full_name text not null`, `email text null` (stored trimmed), `phone text null`, `preferred_channel text null` in (`email`, `phone`, `viber`, `whatsapp`, `other`), `is_primary boolean not null default false`, `archived_at timestamptz null` | Unique index on (`client_id`) where `is_primary and archived_at is null` (one primary per client). Unique index on (`client_id`, `lower(email)`) where `email is not null and archived_at is null`. |
| `projects` | `client_id uuid not null` → `clients`, `name text not null`, `status text not null default 'planned'` in (`planned`, `active`, `on_hold`, `done`, `cancelled`), `description text null`, `start_date date null`, `target_end_date date null`, `actual_end_date date null`, `archived_at timestamptz null` | Unique (`id`, `client_id`) (target of the contract composite key). Check `target_end_date >= start_date` when both set; check `actual_end_date >= start_date` when both set; check `actual_end_date is null or status in ('done', 'cancelled')`. |
| `systems` | `id text primary key` (slug, check `id ~ '^[a-z0-9-]+$'`, replaces the uuid convention), `name text not null`, `status text not null` in (`built`, `in-progress`, `next`, `planned`) (the same values as the public `ProductStatus`), `public_summary text not null`, `summary text null` (private), `lessons text null`, `stack text[] not null default '{}'::text[]`, `standalone boolean not null default false`, `sort_order integer not null default 0`, `archived_at timestamptz null` | Index on (`workspace_id`, `status`, `sort_order`). |
| `project_systems` | `project_id uuid not null` → `projects`, `system_id text not null` → `systems`. No `id`, no `updated_at`. | Primary key (`project_id`, `system_id`). Hard delete allowed (a link, not a record). |
| `contracts` | `client_id uuid not null` → `clients`, `project_id uuid null`, `title text not null`, `status text not null default 'draft'` in (`draft`, `sent`, `signed`, `active`, `ended`, `cancelled`), `amount_minor bigint null` (centavos), `currency text not null default 'PHP'`, `billing_cadence text null` in (`one_time`, `monthly`, `milestone`), `start_date date null`, `end_date date null`, `terms_summary text null`, `archived_at timestamptz null` | Composite foreign key (`project_id`, `client_id`) → `projects(id, client_id)` (skipped when `project_id` is null), so the project always belongs to the same client. Check `amount_minor >= 0`; check `currency ~ '^[A-Z]{3}$'`; check `end_date >= start_date` when both set. Index on (`workspace_id`, `status`), on `client_id`, on `project_id`. |
| `contract_status_events` | `contract_id uuid not null` → `contracts`, `from_status text null`, `to_status text not null`, `changed_at timestamptz not null default now()`, `note text null`. No `updated_at` (append only). | Both statuses checked against the contract status list. Check `from_status is null` only when `to_status = 'draft'`; check `from_status is distinct from to_status`. Unique index on (`contract_id`) where `from_status is null` (one opening event). Index on (`contract_id`, `changed_at`). Trigger `contract_status_events_append_only` (custom migration) raises on any `update` or `delete`. |
| `notes` | `body text not null` (check `length(trim(body)) > 0`), `client_id uuid null` → `clients`, `contact_id uuid null` → `contacts`, `project_id uuid null` → `projects`, `contract_id uuid null` → `contracts`, `system_id text null` → `systems` | Check `num_nonnulls(client_id, contact_id, project_id, contract_id, system_id) = 1`. One index per target column on (`<target>`, `created_at desc`). Notes can be edited and hard deleted. |
| `system_links` | `from_system_id text not null` → `systems`, `to_system_id text not null` → `systems`, `label text not null`, `state text not null` in (`live`, `planned`) | Unique (`from_system_id`, `to_system_id`). Check `from_system_id <> to_system_id`. Hard delete allowed. |
| `system_resources` | `system_id text not null` → `systems`, `kind text not null` in (`repo`, `live`, `docs`, `board`, `other`), `label text not null`, `url text not null` (check `url ~ '^https?://'`) | Index on `system_id`. Hard delete allowed. Never public. |

Relationships: workspace 1:N every table · client 1:N contacts, projects, contracts · project 0..1:N contracts (same client) · project N:M systems (through `project_systems`) · contract 1:N status events · client, contact, project, contract, or system 1:N notes (exactly one target per note) · system N:M system (through `system_links`, directed) · system 1:N resources.

`STUDIO_WORKSPACE_ID` = `00000000-0000-4000-8000-000000000001`, exported from `src/studio/data/workspace.ts` and written literally in the workspace migration.

**State transitions** (contract):

```
draft ──► sent ──► signed ──► active ──► ended
  ▲         │         │
  └─────────┘         │
draft, sent, signed ──► cancelled
```

`ended` and `cancelled` are final. The allowed steps live in one exported map, `CONTRACT_TRANSITIONS` in `src/studio/data/contracts.ts` (every status is a key; `ended: []` and `cancelled: []`), the only source `changeContractStatus()` and later UI (feature 23) read. Client and project statuses are free moves within their lists in this feature; feature 22 decides whether they need rules.

**API surface** (server only functions in `src/studio/data/`, each `import "server-only"` and `@/studio/marker`; callers are guarded pages and server actions, or the seed script, per spec 0003):

| Function | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `getWorkspaceId()` (`workspace.ts`) | read, async | none | `Promise<string>`: `STUDIO_WORKSPACE_ID` | caller guarded | none (feature 21 swaps the body for a session lookup) |
| `getRecordCounts()` (`counts.ts`) | read | none | `{ clients, contacts, projects, contracts, notes, systems, systemLinks }`, each a number (`count(*)::int`) | caller guarded | throws on any database error; the shell catches it and hides the counts |
| `createContract(input, opts?)` (`contracts.ts`) | write, one transaction | `clientId: string` (req), `title: string` (req), `projectId?: string`, `amountMinor?: bigint` or a safe integer `number` (converted to bigint; a fraction is rejected), `currency?: string` (trimmed, uppercased), `billingCadence?`, `startDate?`, `endDate?`, `termsSummary?`; `opts.id?: string` (fixed id, seed only) | the new contract row | caller guarded | `ClientNotFound` (missing, other workspace, or archived), `ProjectNotFound` (missing, archived, or another client's), `InvalidContractInput` (bad amount, currency, or dates) |
| `changeContractStatus(input)` (`contracts.ts`) | write, one transaction | `contractId: string` (req), `to: ContractStatus` (req), `note?: string` (trimmed; blank becomes null) | the updated contract row | caller guarded | `InvalidContractTransition`, `ContractStatusConflict`, `ContractArchived`, `ContractNotFound` |
| `archiveClient(clientId)` (`clients.ts`) | write | `clientId: string` | the archived client | caller guarded | `ClientHasLiveContracts`, `ClientNotFound` |
| `archiveContract(contractId)` (`contracts.ts`) | write | `contractId: string` | the archived contract | caller guarded | `ContractNotArchivable`, `ContractNotFound` |
| `closeDb()` (`db/client.ts`) | lifecycle | none | ends the pool | seed only | none |
| `npm run db:seed` (`scripts/seed-studio.ts`) | script | env loaded by `loadEnvConfig(process.cwd(), true)` from `@next/env` before the data layer is imported (dynamic `import()`), so `.env.development.local` wins | logs the target host, then created vs already present rows; calls `closeDb()` at the end | refuses on Vercel or the production host | exits 1 on any error |

Every function works only on rows whose `workspace_id` equals `getWorkspaceId()`; a row in another workspace counts as not found. Every error class extends `StudioDataError` and carries a stable `code` string (e.g. `INVALID_CONTRACT_TRANSITION`), so feature 23's server actions can return codes instead of class instances. Lock order is always client row, then contract row. The data layer imports nothing from `next/*`, so the seed can run it under `tsx`. The seed needs Node 22 or newer locally (a global `WebSocket` for the Neon driver) and exits with a clear message if `WebSocket` is missing.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Top level insert (client, system) | `workspace_id` | `await getWorkspaceId()`, the constant `STUDIO_WORKSPACE_ID` until feature 21 |
| Child insert (contact, project, contract, event, note, link, resource, project system) | `workspace_id` | the parent row just loaded in the same call (itself filtered by `getWorkspaceId()`) |
| Any insert | `id`, `created_at`, `updated_at` | Postgres defaults (`gen_random_uuid()`, `now()`); `systems.id` is the slug from the input (seed: the public `ProductId`) |
| Any update | `updated_at` | set by the data layer on each Drizzle update (`$onUpdate(() => new Date())`); raw SQL updates in tests leave it unchanged, which is accepted |
| `createContract` | `status`, first event | literal `draft`; event `from_status` null, `to_status` `draft`, `changed_at` `now()` |
| `createContract` | `id` | `opts.id` when given (seed only), else `gen_random_uuid()` |
| `createContract` | `currency` | input trimmed and uppercased, else the column default `PHP` |
| `changeContractStatus` | whether the step is allowed | `CONTRACT_TRANSITIONS[current status]` includes `to`; current status and `archived_at` read from the contract row locked `for update` inside the transaction (after locking its client row) |
| `changeContractStatus` | conflict | the update's `where status = <status read>` affected 0 rows |
| `changeContractStatus` | event row | `from_status` = status read, `to_status` = input `to`, `changed_at` = `now()`, `note` = input |
| Later reads (feature 23) | when a contract was sent or signed | the `changed_at` of its event with that `to_status` (derived, never stored on the contract) |
| `archiveClient` | live contract check | inside one transaction, after locking the client row `for update`: `exists` a contract of that client with `status in ('signed', 'active')` and `archived_at is null` |
| `archiveClient`, `archiveContract` | `archived_at` | `now()`; an already archived row keeps its original value |
| `getRecordCounts` | each count | `count(*)::int` per table where `workspace_id = getWorkspaceId()` and, for archivable tables, that row's own `archived_at is null` (a child of an archived client still counts until it is archived itself); notes and system links have no archive and count all rows |
| Shell | whether counts show | the database line state from spec 0003 is `migrated` and `getRecordCounts()` did not throw |
| Shell | count labels and order | literal labels in this order: Clients, Contacts, Projects, Contracts, Notes, Systems, System links; rendered as more rows of the existing status list |
| Seed | fake client rows | literal rows in `scripts/seed-studio.ts` with fixed uuids, inserted with `on conflict (id) do nothing` (contracts through `createContract(..., { id })` when absent) |
| Seed | systems and links | `products` and `productLinks` from `utils/data/products-data.ts`: `id`, `name`, `status`, `summary` → `public_summary`, `standalone`, array position → `sort_order`; links keep `from`, `to`, `label`, `state`; systems insert `on conflict (id) do nothing`, links `on conflict (from_system_id, to_system_id) do nothing` |
| Seed | whether it may run | `VERCEL` and `VERCEL_ENV` unset, and neither the `DATABASE_URL` nor the `DATABASE_URL_UNPOOLED` host (minus a `-pooler` suffix) equals `STUDIO_PROD_DB_HOST` (when set; locally it is usually unset, because the production URLs never live on your machine) |
| Seed | lifecycle walk | each fake contract has a target status; the seed reads its current status and calls `changeContractStatus()` for each remaining step toward the target, so a run that crashed partway resumes, and a finished contract needs no steps |

**Key invariants**:
- Every row of every table except `workspaces` has a `workspace_id`, and a child row's `workspace_id` always equals its parent's. The data layer guarantees the second rule (it is the only writer); the database guarantees the first.
- A contract's status only changes through `changeContractStatus()` (or `createContract()` for the opening `draft`), and every change has exactly one event row. Nothing else updates `contracts.status`; the append only trigger stops anything from rewriting `contract_status_events`.
- Status, kind, money, currency, and date rules are enforced by check constraints, so a bad write from any future caller fails in the database, not only in the app.
- Nothing is hard deleted except notes, `project_systems`, `system_links`, and `system_resources`; foreign keys restrict deletes everywhere.
- Migrations stay forward only and additive (spec 0003): a new status value is a new migration that drops and adds that one check constraint.
- `systems.public_summary`, `name`, `status`, `standalone`, `sort_order`, and `system_links` are the only system data feature 24 may ever export publicly.

**Security model**: One owner (you), one workspace. Every function is reachable only from code that already called `requireStudioAccess()` (pages, layouts, server actions), or from the seed script on your machine against the dev branch. Contact email and phone are personal data under the Philippine Data Privacy Act: they stay in plain columns (Neon encrypts at rest), are read only through the server only data layer, never logged, and never seeded with real values. Private system fields and resources are studio only. When feature 21 lands, `getWorkspaceId()` resolves the workspace from the signed in session, and the workspace filter on every query becomes the tenant boundary for the CRM and Invoicing products.

**Configuration required**: none new. The seed reads `DATABASE_URL_UNPOOLED` and `STUDIO_PROD_DB_HOST`, both defined in spec 0003.

**Critical test scenarios**:
- Happy path: fresh dev branch, `npm run db:migrate`, then `npm run db:seed` → shell shows `Connected, N migrations applied` and counts of 3 clients, 15 systems, 21 system links, and the seeded contacts, projects, contracts, and notes; the walked contract has 4 events (none → draft, draft → sent, sent → signed, signed → active), verifies **AC-1**, **AC-3**, **AC-7**, **AC-8**
- Rerun: `npm run db:seed` a second time → every count unchanged, no new events, no `updated_at` changed; on a scratch branch where the walk was cut short, the seed resumes from the current status, verifies **AC-7**
- Invalid step: `changeContractStatus` from `draft` to `active` → `InvalidContractTransition`, status and events unchanged, verifies **AC-3**
- Race: two `changeContractStatus` calls from `sent` (one to `signed`, one to `draft`) started together with `Promise.all` → one succeeds, the other gets `ContractStatusConflict` or `InvalidContractTransition`, exactly one new event, verifies **AC-4**
- Append only: `update` or `delete` on `contract_status_events` by raw SQL → the trigger raises, verifies **AC-6**
- Database rules: insert a duplicate client name in another case, a second primary contact, a contract with another client's project, a note with two targets, a self link → each rejected by Postgres, verifies **AC-5**
- Archive: `archiveClient` on a client with an active contract → `ClientHasLiveContracts`; `delete from studio.clients` on a client with contacts → foreign key error, verifies **AC-6**
- Scope: a row inserted by SQL with a different `workspace_id` is invisible to every data layer function and every count; a contract created for a seeded client carries that client's `workspace_id`, verifies **AC-2**
- Seed guard: `VERCEL=1 npm run db:seed` → refuses; `STUDIO_PROD_DB_HOST` set to the dev host (with or without `-pooler`) → refuses, verifies **AC-7**
- Empty: on a migrated branch with no seed, every count reads 0; on a branch with no migrations, counts are hidden, verifies **AC-8**
- Public boundary: `npm run build` ends `[leak-check] clean`, `/products` renders exactly as before, `git diff` shows `utils/data/products-data.ts` untouched, verifies **AC-9**, **AC-10**

## Build plan

Tracer Bullet: the first task runs one thin thread through every layer (table, migration, workspace scoping, data layer, shell, seed). Each later task thickens it and ends working.

1. Thin thread. Add `workspaces` and `clients` to `src/studio/db/schema.ts` and run `npm run db:generate`. Add a custom migration (`drizzle-kit generate --custom`) inserting the fixed workspace row with `on conflict do nothing`. Add `src/studio/db/constants.ts`, `src/studio/data/workspace.ts` (`STUDIO_WORKSPACE_ID`, async `getWorkspaceId()`), `closeDb()` in `src/studio/db/client.ts`, and `src/studio/data/counts.ts` with the clients count. Show it on the shell only when the database line is `migrated` and the count did not throw. Add `scripts/seed-studio.ts` with env loading, its guards, and one fake client, plus `"db:seed": "tsx --conditions=react-server scripts/seed-studio.ts"` (dev dependency `tsx`; the `react-server` condition lets the script import the `server-only` data layer). Apply on the dev branch. Satisfies **AC-1**, **AC-2**, **AC-7**, **AC-8**.
2. The rest of the model. Add `contacts`, `projects`, `systems`, `project_systems`, `contracts`, `contract_status_events`, `notes`, `system_links`, and `system_resources` with every constraint and index in the sketch, as one generated migration, plus a custom migration for the `contract_status_events_append_only` trigger. Extend `getRecordCounts()` to every entity. Apply on the dev branch and confirm each table, check, and index exists through `information_schema` and `pg_indexes`. Satisfies **AC-1**, **AC-2**, **AC-5**, **AC-8**.
3. Lifecycle and archive rules. Add `CONTRACT_TRANSITIONS`, `createContract()`, `changeContractStatus()` (transaction, client then contract row locks, conditional update, event row), `archiveContract()`, `archiveClient()` (transaction, client row lock), and the `StudioDataError` classes with their `code` in `src/studio/data/`. Satisfies **AC-3**, **AC-4**, **AC-6**.
4. Full seed. Extend the seed with the three fake companies, their contacts, projects, notes, and contracts (one walked to `active` through `changeContractStatus()`, one draft, one cancelled). Also copy the 15 systems and 21 links from `products-data.ts`, inserted with `on conflict do nothing` so a rerun changes nothing, and walk each contract from its current status toward its target. Run it twice on the dev branch. Satisfies **AC-3**, **AC-7**, **AC-10**.
5. Boundary check. Run `npm run build` and `npm run lint`, and confirm `[leak-check] clean`, `/products` unchanged, and no import of `src/studio/data/` outside the studio, the shell, and `scripts/`. Satisfies **AC-9**, **AC-10**.

## Consequences

**Positive**:
- Features 22, 23, and 24 build screens on a model that already holds its rules, so none of them has to invent a column or a status.
- The workspace column and filter are in place before the first real row, so the CRM and Invoicing split is a copy, not a rewrite.
- Contract history is complete from the first draft, which Invoicing and any dispute later rely on.

**Negative / tradeoffs**:
- Every query carries a workspace filter today for a single owner, a little noise in every function. Forgetting it in a future function is the main risk; the data layer is the only place queries live for that reason.
- The child equals parent workspace rule is enforced in the app, not the database (composite keys everywhere would double every foreign key). A raw SQL insert can break it.
- Text plus check constraints means a new status value is a migration that drops and adds a constraint, slightly more ceremony than an enum.
- `systems.id` is a global slug, not scoped by workspace. If another tenant ever keeps its own systems map, the key must become (`workspace_id`, `id`), a real migration. The scope treats the systems map as yours alone, so this is accepted.
- Archive instead of delete means every list query must remember `archived_at is null`, and archived personal data stays until you choose a retention rule.
- The seed adds `tsx` as a dev dependency and needs Node 22 or newer locally.
- One trigger (the append only guard on events) lives in SQL, the only logic outside TypeScript.

**Neutral**:
- Spec 0003's migrate on build step applies these migrations to production on the next deploy, flag on or off. They are additive, so this is safe, and production gets the workspace row and empty tables.
- `products-data.ts` stays the public source until feature 24 replaces it with an export from `systems`.
- The client and project status lists may grow in feature 22.

## Follow-up

- [ ] Feature 21 (login): replace the body of `getWorkspaceId()` with the signed in session's workspace; add a membership link between the owner user and `workspaces`.
- [ ] Feature 22 (client tracking): decide pagination and search for the client list (the unique `lower(name)` index is partial, so search may need its own index), and whether client and project status moves need rules.
- [ ] Feature 23 (contracts): build the screens on `CONTRACT_TRANSITIONS`, and add the template and PDF columns or tables it decides on, additively.
- [ ] Feature 24 (systems map): import the private fields and resources from the Claude artifact, and generate the public export from `systems` and `system_links`.
- [ ] Decide a retention rule for archived contact data before real client data lands (Data Privacy Act: keep personal data no longer than needed).
- [ ] `/sync`: record in `src/studio/AGENTS.md` that every data layer function filters by `getWorkspaceId()`, that contract status changes only go through `changeContractStatus()`, and the `db:seed` command.
