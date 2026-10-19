# 0004. Studio data model: rationale

## Context

The studio (spec 0003) is live as an empty shell: a guarded `/studio` area, a Neon database with an empty `studio` schema, and a private file store. Features 22 (client tracking), 23 (contracts and PDF export), and 24 (private systems map) all need records to work on. If each of them invents its own tables, the first one locks in choices the others must work around, and the contract lifecycle (draft, sent, signed, active, ended) ends up enforced in whichever screen happens to change it.

The studio is also customer zero for your planned CRM and Invoicing products, where other businesses become the customers. The scope asks for a model that grows into those products without a breaking migration. The most expensive thing to add after real data exists is the boundary between businesses: every query, unique rule, and index changes when it arrives late.

The data is confidential business data: client companies, the people you deal with (names, emails, phone numbers), contract terms and amounts, plus private notes about your own products. Contact details are personal data under the Philippine Data Privacy Act. One engineer builds and runs everything, and migrations run unattended in the Vercel build (spec 0003), so they must be forward only and additive.

The public `/products` page (spec 0002) reads a hand edited file with public fields only. The private systems map (notes, lessons, stack, repo links) must sit beside those public fields in the studio without ever reaching the public build.

## Options considered

### Option 1: One relational schema scoped by workspace, rules in the database

Eleven tables in the `studio` schema. Every record carries a `workspace_id` pointing at a single fixed workspace row. Statuses are text with check constraints, and uniqueness, ownership, and money rules are database constraints. The contract lifecycle lives in one server function that writes an append only history table in the same transaction.

**Pros**:
- The tenant boundary exists before the first real row, so the CRM split needs no rewrite.
- Bad data fails in Postgres no matter which future screen or script writes it.
- The contract history is complete and trustworthy from day one.

**Cons**:
- Every query must filter by workspace, a small cost repeated everywhere, and a missed filter is a bug.
- More tables and constraints to write and test before the first screen exists.

### Option 2: Single owner, minimal tables

The same entities without a workspace column, with fewer database constraints (rules checked in the app), and a status column on contracts without a history table.

**Pros**:
- Least code today, and the fastest path to the client tracking screens.
- Queries are shorter, with no tenant filter.

**Cons**:
- Adding tenancy later means backfilling every table and changing every unique rule, index, and query: the breaking migration the scope wants to avoid.
- Without history, sent and signed dates live in columns that can drift, and the lifecycle has no audit trail.

### Option 3: Document style records in JSON columns

A few tables (`clients`, `contracts`, `systems`) with most fields in a `jsonb` column, shaped in TypeScript.

**Pros**:
- Fields can change without a migration.
- Mirrors the free form shape of the current Claude artifact.

**Cons**:
- The data is clearly relational (clients own contacts, projects, and contracts), so joins, uniqueness, and foreign keys get weaker or move into the app.
- Postgres can no longer check statuses, amounts, or ownership, and reporting for the CRM gets harder.

## Rationale

Option 1 fits the forces best. The scope's strongest constraint is growing into CRM and Invoicing without a breaking migration, and the one change that breaks everything when it comes late is the tenant boundary. Putting `workspace_id` on every table now, with one fixed row and one `getWorkspaceId()` function, costs a filter per query today. In return, feature 21 only swaps a function body, and the CRM split becomes a copy of rows instead of a rewrite. Option 2 is faster this week, but it trades that week for exactly the migration the scope rules out.

Enforcing the rules in Postgres matters because migrations and future callers are unattended. Statuses, money, uniqueness, and the project belonging to the same client all fail at the database, so a script, a server action, or a later product cannot write bad rows. Text with check constraints was chosen over Postgres enum types because spec 0003 applies all pending migrations in one transaction, and a value added with `ALTER TYPE ... ADD VALUE` cannot be used in that same transaction. The contract lifecycle lives in one function rather than a trigger, so it stays readable and testable in TypeScript. A conditional update (only while the status is still the one read) handles two changes racing without locks.

Option 3 was weighed honestly: it suits the artifact's free form shape, but this domain is relational, and giving up constraints is the opposite of what an unattended, one engineer system needs. Archive timestamps were chosen over hard deletes so contract history and notes can never vanish under a client. Notes use one real foreign key per target, with a check that exactly one is set, so a note can never point at nothing. The systems keep their public slug as the key so feature 24's public export stays a straight mapping. That key is global, not per workspace, which is acceptable because the systems map is yours alone.
