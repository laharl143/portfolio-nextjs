# 0011. Client data retention with owner reviewed removal

**Date**: 2026-10-21
**Status**: Accepted

## Summary

Archived contacts and archived clients become eligible for owner reviewed removal after 12 calendar months. Holds and linked business records block removal. A fresh preview and explicit confirmation protect against removing data that changed during review. The existing inquiry cleanup stays separate.

## Requirements

As the studio owner, you can identify personal data no longer needed, preserve records with an ongoing purpose, and confirm precisely what is removed.

- **AC-1**: A signed in owner can open `/studio/retention` from studio navigation, read the policy, and browse archived clients and independently archived contacts with due dates, eligibility, and blocker reasons. Filters are `kind=all|client|contact`, `state=all|eligible|blocked|waiting`, and positive `page`; defaults are all, all, 1. Lists contain 50 rows per page, ordered by due date, kind, and UUID. Empty, filtered empty, loading, error, and not found states work at 375px and desktop in both themes with keyboard access.
- **AC-2**: A client is due at its `archived_at` plus 12 calendar months. A contact is due at its own `archived_at` plus 12 calendar months; contacts whose client is archived appear only within that client's preview. A converted client stays live until deliberately archived through the existing workflow. Conversion, viewing, editing, and hold changes never reset either archive clock. Due means database current time is at or after the due instant.
- **AC-3**: A due client is removable only if it has no project of any status, no contract of any status, no linked source inquiry, no active client hold, and no held child contact. A due independently archived contact requires a live parent, no parent or contact hold, no contract of any status belonging to its parent, and no source inquiry referencing that contact. All blockers are visible; releasing a hold never bypasses a relationship blocker.
- **AC-4**: You can set or release a hold on a client or contact from retention screens, including a live client holding archived contacts. Choose `contract`, `payment`, `dispute`, or `other_business_need`. Release requires explicit confirmation. Every change is version checked and audited. A client hold applies to all its contacts. Holds have no automatic expiry and remain visible for owner review.
- **AC-5**: A guarded preview of one target shows its name, due date, holds, blockers, and the exact records to remove. Client removal includes all its contacts and client and contact notes; contact removal includes that contact and its notes. The page warns that removal is irreversible, related free text elsewhere is not searched, and historical backups and third party copies are outside this operation. Only an eligible preview offers confirmation.
- **AC-6**: Confirmation requires the server issued preview UUID, a checked irreversible removal acknowledgement, and the exact word `DELETE`. Preview expires after ten minutes. The server rechecks ownership, expiry, full snapshot, due time, holds, and blockers in one transaction. Any change requires a new preview. Deletion and its audit receipt commit together; a failure rolls everything back. Repeating a successful confirmation returns the same receipt without removing anything else.
- **AC-7**: Contract bodies, events, PDFs, projects, systems, and source inquiries are never removed or rewritten by this feature. Inquiry retention, its conversion rules, foreign keys, and append only contract triggers retain their existing behavior. Unknown or other workspace targets return not found without revealing their existence.
- **AC-8**: Reads and actions require the existing enabled studio and owner session. Every query is workspace scoped. Private target data stays out of URLs, application logs, public bundles, and audit receipts; UUIDs and safe filter values may appear in private URLs. No public cleanup endpoint or automatic client deletion job is added.
- **AC-9**: Receipts record operation UUID, actor, workspace, target kind and UUID, policy version, time, and aggregate counts only. Hold events additionally record the reason code and set or release action. Preview metadata expires after ten minutes and audit receipts after 12 calendar months. Bounded lazy cleanup enforces these metadata limits on retention page reads and mutations; stale rows are never displayed as current previews. The policy page states that cleanup is eventual at the next use.
- **AC-10**: Meaningful automated unit, database, and browser tests cover calendar boundaries, blockers, tenant isolation, holds, stale previews, atomic rollback, concurrent operations, and repeated confirmation. Lint, build, and studio leak checks pass. Use the already chosen Vitest, Testing Library, and Playwright setup.

## Decision

**Chosen option**: Owner reviewed hard removal of unencumbered archived data, with explicit holds and a fresh server preview.

Workflow is Beta and delivery follows the project's Tracer Bullet approach. Reuse Next server actions, the owner session, Neon Postgres, Drizzle transactions, and current studio UI conventions. No new package, service, environment variable, or account is needed.

**Implementation skills**: `drizzle-orm` (`oakoss/agent-skills`, `.agents/skills/drizzle-orm/`), for schema constraints and transactional mutations. Implementation should also follow the existing studio context and installed framework and UI skills as relevant.

The engineer chose a new separate spec and ordinary freelance business holds, then delegated all recommended choices through completion of this architect run on 2026-10-21. This includes the assembled model, policy, final content confirmation, and a fresh context critique. Model independence of that critique is not claimed. The 12 month duration is a product policy for otherwise unneeded archived data, not a statement of any statutory retention period. This authorization does not execute removal, migrations, implementation, or deployment.

## Feature design

### Policy and boundaries

Policy version is the constant `client-retention-v1`. Compute due dates in Postgres as `(archived_at AT TIME ZONE 'UTC' + interval '12 months') AT TIME ZONE 'UTC'`; this clamps February 29 to February 28 in the following non leap year. Display with existing `STUDIO_TIME_ZONE`, Asia/Manila. Never substitute 365 days or browser time. Missing archive time means ineligible.

Whole client removal is an explicit exception to spec 0004's archive only default, limited to the eligible records described here. There is no blanket cascade. Contacts under archived clients use the client's clock because the entire relationship is archived and existing child mutations already refuse archived clients. A newly found obligation requires a hold, not silently extending timestamps. Existing archived rows use their existing timestamps, with the same explicit confirmation as new ones.

An archived client with even an ended, cancelled, draft, or archived contract remains blocked. Projects also block whole client removal even when archived. Removing or anonymizing those records needs a separate policy. For an independently archived contact, any parent contract conservatively blocks removal because contract text or PDFs may contain contact details without a structured contact foreign key. The UI explains this limit. Client notes are removed only with the whole client, never guessed to belong to an individual contact.

Inquiry references are blockers regardless of their current due date. Let spec 0010's existing job remove the source first. Never clear conversion foreign keys or weaken its converted record check to make removal succeed. The copied inquiry note follows its ordinary client note relationship and survives while that client is retained.

This slice does not claim complete erasure of a person from arbitrary free text, exported files, owner mailboxes, or backups. The policy page names these boundaries. Formal erasure requests and retention of contracts, projects, billing records, and external copies remain separate work.

### Target data model

This model is confirmed under the engineer's delegation. All new tables live in `studio`. Additive migration only; do not relax existing foreign keys or contract triggers.

| Entity | Required fields and keys | Nullable fields and rules | Relationships |
|---|---|---|---|
| Existing `clients` and `contacts` | Add `retention_hold boolean not null default false` | Add `retention_hold_reason text null`; check true has one allowed reason and false has null | Existing workspace and parent keys unchanged; hold writes update `updated_at` |
| `retention_previews` | `id uuid` PK server generated; `workspace_id uuid` FK; `actor_user_id uuid` FK owners with restrict; `kind text` client or contact; `target_id uuid`; `client_id uuid`; `policy_version text`; `snapshot_hash text` SHA256; `created_at timestamptz` default DB time; `expires_at timestamptz` created plus ten minutes | No personal content, names, note bodies, or target FK; index expiry and workspace/actor | Workspace 1:N previews; actor 1:N previews; target ids are references for revalidation, not deletion cascades |
| `retention_events` | `id uuid` PK, also removal preview UUID for a removal receipt; `workspace_id uuid` FK; `actor_user_id uuid` FK owners with restrict; `kind text` client or contact; `target_id uuid`; `action text` remove, hold_set, hold_release; `policy_version text`; `created_at timestamptz` DB time; `counts jsonb` | `reason text null`, required allowed code for hold_set/release, null for remove; counts has nonnegative integer `clients`, `contacts`, `notes` only; all zero for hold events | No FK to removed targets. Index workspace/time and expiry; no content payload or arbitrary note |

Add workspace/archive/id indexes for clients and contacts for retention scans. No stored eligibility or due date. Event UUID uniqueness provides removal idempotency. Event mutation is forbidden in application code; metadata retention alone deletes expired events. Do not attach the contract append only trigger to these tables. Restrict counts to exactly the three specified keys. No new settings or policy editor is needed.

`snapshot_hash` is SHA256 of canonical JSON, fixed field order and arrays sorted by UUID, containing policy version, target kind/id, parent client id and full precision version, target version/archive time/hold state/reason, every included contact's id/version/archive time/hold state/reason, each included note's id/version/parent ids, and all blocker ids plus their versions or status where available. Hash the full current set, including empty sets. No note text or name is persisted in the snapshot. Changes to those values already change their row version. Parent client note changes are outside an individual contact's removal set. Every mutation still recomputes current eligibility separately.

### State transitions

Eligibility is derived: live, waiting for due date, blocked, eligible, then removed. For archived list candidates, state precedence is blocked whenever any blocker exists, otherwise waiting before the due instant, otherwise eligible. Show the due date and whether it has passed independently of this state. Holds can move any retained target to blocked; release recomputes all other blockers. No restore is offered. An eligible target produces an active preview; it becomes expired, stale, or consumed. Only a matching unexpired receipt proves consumed. Page visits create no hold or retention clock changes.

### UI and API surface

Reuse studio navigation, form fields, confirmation dialog, pending buttons, action errors, date formatters, and layout. No public design or assets are needed. The list explains the policy and has separate client and contact rows; each row links to a private review page. A client preview lists all included records, paginated 50 per section, and aggregate totals, so the owner can review the entire set. Never silently truncate the removal set. The preview UUID page reads a persisted plan; a POST creates a preview, so GET cannot generate tokens. Set no store caching on all retention surfaces.

| Surface | Inputs | Outputs | Guard and important errors |
|---|---|---|---|
| `GET /studio/retention` | kind, state, page; validated safe enums | Policy, paged rows, totals, due times and blocker codes | Owner session; invalid filters default; clamp page to last available, empty is page 1 |
| `GET /studio/retention/[kind]/[id]` | kind enum and target UUID | Current target, counts, holds, eligibility and preview form; parent client hold controls | Owner session; invalid, unknown or other workspace is 404 |
| `createRetentionPreviewAction(prev, formData)` | kind, target UUID | Redirect `/studio/retention/previews/[previewId]` for eligible target, or coded blocker error | Owner; recompute set; `NOT_ELIGIBLE`, `NOT_FOUND`, `TOO_LARGE` |
| `GET /studio/retention/previews/[previewId]` | preview UUID; section pages as positive integers | Fresh details, exact removal set and confirmation form, or expired/stale message | Owner and matching actor/workspace; `NOT_FOUND`; no reuse by another actor |
| `confirmRetentionRemovalAction(prev, formData)` | preview UUID, acknowledgement true, confirmation `DELETE` | Redirect `/studio/retention/receipts/[eventId]` | Owner; `PREVIEW_EXPIRED`, `STALE_PREVIEW`, `NOT_ELIGIBLE`, `BUSY`, `NOT_FOUND` |
| `setRetentionHoldAction(prev, formData)` | kind, id, full precision version, boolean hold; allowed reason for set; release acknowledgement for release | Redirect target review with updated hold; safe field errors | Owner; `STALE_RECORD`, `INVALID_INPUT`, `NOT_FOUND`, `BUSY` |
| `GET /studio/retention/receipts/[eventId]` | event UUID | Own workspace receipt counts, time and policy; no copied target content | Owner; unknown, expired or other workspace is 404 |

Hold release audit uses the previous reason from the locked row. Repeating a requested hold state with the same reason succeeds without another event if it already matches; otherwise full precision version must match. Release of an already clear hold succeeds without a new event. Hold controls accept live clients and live contacts through a directly linked target review; the main retention list remains archive focused. Every client target review, including blocked or waiting clients, lists all its contacts with their hold controls in pages of 50 ordered by UUID. Contact controls link to their review pages even when the parent is archived. Safe positive page parameters select these sections. Blocked records do not need an eligible preview to release a hold. Hidden inputs and URL ids never supply workspace or actor identity.

### Consistency and failures

All mutations acquire spec 0010's `workspaceLock(tx, workspaceId)` first, then the parent client row, then target and included contact/note rows in sorted UUID order. This matches conversion's workspace then client order. Existing client, contact, project, note, and contract writes already lock the client first, so they serialize against removal; do not call `lockLiveClient` for an archived target, use a retention helper that allows archive but still scopes workspace. Do not lock an inquiry row after taking the client lock: the workspace lock already serializes source cleanup and conversion. Read blockers inside that protection. PostgreSQL foreign keys remain the last defense, including malformed cross workspace references.

Set local lock timeout 3 seconds and statement timeout 10 seconds before lock acquisition. A lock or statement timeout rolls back and returns `BUSY` with a retry message and no SQL detail. Preview creation computes a fresh snapshot within these locks. Confirmation first checks for an unexpired successful removal receipt with this preview UUID in the current workspace and actor; if present, return it even when preview metadata has expired or been removed. Ignore expired receipt rows even if bounded cleanup has not physically removed them. Then lock/load the preview and validate its actor, policy version, expiry, and target. Recompute the full snapshot and blockers under locks and reject any mismatch.

For contact removal, delete its notes, then the contact. For client removal, delete notes attached directly to the client or any included contact, then those contacts, then the client. Scope each deletion by workspace and parent ids and assert affected counts match the snapshot. Insert the receipt using the preview UUID and delete the consumed preview within that same transaction. No external side effect is involved. On failure the preview remains usable until expiry; on uncertain network outcome retry the same UUID. After receipt expiry, a retry can return not found but cannot recreate a target or perform another removal.

Cap a removal at 1,000 total client/contact/note rows, computed before preview creation and checked again at confirmation. A larger set returns `TOO_LARGE` without mutation and explains that this slice cannot process it. Do not split an irreversible removal across transactions. Lists and preview sections still paginate. Unexpected foreign key failures return `DEPENDENCY_BLOCKED`, preserve everything, and require a fresh preview. Unexpected errors log action and sanitized class/code only.

### Value sourcing

| Produced value | Source |
|---|---|
| Workspace and actor | Verified owner session and `getWorkspaceId()` |
| Target name and related records | Workspace scoped existing clients, contacts, notes; display only |
| Due date and eligibility time | Existing archive timestamp, fixed UTC 12 calendar month formula, database clock |
| Blockers | Current hold columns, projects/contracts by client, inquiry conversion foreign keys, held child contacts |
| Removal set and counts | Current scoped client/contact/note relationships, no text classification |
| Full precision versions | Existing `updated_at::text` convention |
| Preview token and expiry | Server UUID and database time, plus ten minutes |
| Confirmation consent | Explicit posted acknowledgement and exact confirmation word |
| Snapshot and policy | Canonical row metadata described above and `client-retention-v1` |
| Receipt and idempotency | Transactional `retention_events` row keyed by preview UUID |
| Hold reason | Validated enum on set, locked previous reason on release |
| Pagination totals and status filters | Same derived eligibility predicate as preview and confirmation, evaluated against one DB time per request |

### Security and metadata lifecycle

Every page and action calls `requireStudioAccess()` before reading or writing. Service modules use existing server only and studio marker conventions. IDs are not permission checks. Use bound SQL values. Preserve origin checks supplied by Next server actions. Return the existing ActionState shape with safe field errors; keep framework redirects and auth control flow outside caught application errors. No target content enters query parameters, receipt JSON, or logs.

Before retention reads and mutations, run a separate bounded transaction deleting at most 1,000 expired previews and at most 1,000 events older than 12 calendar months in the authenticated workspace, oldest first. Use the same UTC calendar formula for event expiry, with expiry at equality. Set local lock timeout 3 seconds and statement timeout 10 seconds for cleanup too. A cleanup failure or timeout is logged by code only and does not block ordinary reads or authorize or bypass removal. Expired data is filtered out even if cleanup fails. No background scheduling is added. The policy page explains physical metadata removal occurs on next use and can lag by multiple visits when backlog exceeds the cap. Operational logs must not contain target UUIDs or text. Audit ids remain private pseudonymous metadata while retained.

Backups may retain deleted data under their existing provider lifecycle. Before reconnecting a restored database, the owner sets existing `STUDIO_ENABLED=false` and redeploys, keeping the entire studio inaccessible during reconciliation. Do not point the live app at the restored database before this gate is in effect. Reconcile restored data against applicable removal records or independently confirm a safe review, delete all restored retention previews, then reenable the studio and redeploy. Every later removal needs a fresh preview. Include this runbook on the policy page. This slice neither changes backup retention nor promises automatic replay after receipt expiry; no new switch is introduced.

### Critical test scenarios

- Leap day, month end, exact cutoff and one instant before it, live converted client, and old archived seed: AC-2.
- Every hold and relationship blocker, held child, source inquiry before and after existing cleanup, and client notes preserved during contact removal: AC-3, AC-4, AC-7.
- Exact preview set, page through all rows, confirmation typing, expiry, changed note/contact/hold, policy mismatch, limit exceeded: AC-1, AC-5, AC-6.
- Two simultaneous confirmations return one receipt; competing hold and removal serialize; competing child create or conversion cannot produce a partial result; injected delete/event failure rolls back: AC-6, AC-7.
- Signed out, disabled studio, other workspace or actor, forged preview UUID, safe URL and log checks: AC-8.
- Metadata cleanup boundary, capped backlog, cleanup failure, and retry after preview expiry with a valid receipt: AC-6, AC-9.
- Keyboard, mobile, themes, empty/error states, and successful end to end fake data removal: AC-1, AC-10.

## Build plan

1. Thin thread: additive hold columns and preview/event tables, shared policy calculation, guarded list and contact review, preview, confirmation, transactional removal and receipt using fake data. Satisfies AC-1, AC-2, AC-5, AC-6, AC-8.
2. Full lifecycle: whole client removal, all blockers, hold set/release, snapshot invalidation, bounded sets, source inquiry interplay, lock ordering and rollback. Satisfies AC-2, AC-3, AC-4, AC-5, AC-6, AC-7.
3. Hardening: metadata expiry, all states, pagination, policy boundaries and backup restoration guidance, access and privacy checks, meaningful automated tests, lint/build/leak check. Satisfies AC-1, AC-6, AC-8, AC-9, AC-10.

## Consequences

Manual review prevents accidental timed deletion but relies on you returning to clear the backlog. Conservative contract and project blockers retain some data longer and make this a limited removal tool rather than a complete erasure service. Removal is irreversible in the live database. Metadata cleanup is eventual and audit receipts are themselves retained for a finite period. No third party operating cost is added.

## Follow-up

- Separate contract/project personal data policy, including signed PDFs and immutable history, before offering their removal or anonymization.
- Formal erasure requests and backup or external copy reconciliation need a separate workflow if required.
- Consider automatic scheduling only after actual review volume warrants it.

## Rationale

See [rationale.md](rationale.md) for options and decision reasoning.
