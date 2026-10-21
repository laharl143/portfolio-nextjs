# 0010. Lead intake: public contact form, private inquiry inbox, and deliberate client conversion

**Date**: 2026-10-21
**Status**: Accepted

## Summary

Visitors can send a freelance project inquiry from a dedicated contact page. You review it in your private studio and choose whether to connect it to an existing client or create a client lead. The inquiry is saved before an email alert is attempted, so an email failure never loses the inquiry. Old inquiries are removed through a daily retention job.

## Requirements

**User stories**:
- As a prospective client, I can describe my project without creating an account.
- As Ed, I can review inquiries privately, follow their status, and connect suitable inquiries to clients without duplicates.
- As Ed, I can see and retry failed alerts without asking a visitor to submit again.

**Acceptance criteria**:
- **AC-1**: `/contact` reuses the public Header, Footer, theme, spacing, and form conventions. Contact Me calls to action open it. Existing social and email links remain available as alternatives. The page has its own canonical, title, description, and share metadata and is in `PUBLIC_ROUTES` and the sitemap.
- **AC-2**: The form requires name, email, and project description. Company and free text budget are optional. It has labels, field errors, pending and success states, preserved values on failure, and keyboard access at 375px and desktop in both themes. No uploads, visitor accounts, or visitor email receipt are added.
- **AC-3**: Only a validated submission with a valid bot challenge and origin passes the public endpoint. Submission keys prevent repeated requests from saving multiple inquiries or sending multiple initial alerts. Reusing a key with different fields fails without changing the existing inquiry.
- **AC-4**: After the transaction saves an inquiry, the visitor sees a generic success confirmation, regardless of the alert result. A failed save shows an error and preserves inputs. No public response exposes an inquiry id, submitted content, client match, alert status, or any inbox read capability.
- **AC-5**: The signed in studio has an Inquiries list and detail page. The list supports status and alert filters, search, and paging. It shows New, Reviewing, Converted, and Closed separately. Viewing an inquiry does not change its status or retention clock.
- **AC-6**: New or Reviewing inquiries may be closed or converted. Closed inquiries may be reopened to Reviewing. Converted inquiries cannot be reopened or converted again. Every owner mutation checks its workspace and version, and records a content free event.
- **AC-7**: Conversion explicitly selects an existing live client or creates a client with Lead status. The owner confirms the client name, contact, and original project description note. One transaction creates or links these records and marks the inquiry Converted. Repeated or racing conversions create at most one conversion, and an archived client or conflicting name leaves the inquiry unchanged.
- **AC-8**: Owner alerts use a configured sender and recipient, contain only generic text and a private inbox link, and never use the visitor address as sender or recipient. Provider acceptance, failure, and uncertain outcomes are distinct in the studio. Retry cannot knowingly create duplicate alert requests within the provider deduplication window.
- **AC-9**: A daily authenticated job deletes unconverted inquiries with no owner activity for 12 calendar months. Converted source inquiries are deleted 12 months after conversion; their client, contact, and copied note remain under the separate client policy. Related inquiry events and alerts are removed too. Opening a page, sending an alert, and visitor retries do not extend retention.
- **AC-10**: All inbox reads and mutations require the existing owner session, remain workspace scoped, and never appear in public bundles, metadata, logs, analytics payloads, or responses. Public intake and scheduled cleanup have separate narrow entry points and never create an owner session.
- **AC-11**: Production intake fails closed when configuration is incomplete. Preview never accepts real inquiries or sends alerts. Local verification uses fake data and provider test behavior. Existing studio enable flags, login guards, secret scanning, and public import boundaries remain intact.
- **AC-12**: Lint, build and studio leak checks pass. Verification covers the public form, private inbox, notification failure, conversion concurrency, retention, and access denial. Beta includes meaningful automated tests for these rules, with the framework chosen through the test workflow before implementation of tests.

## Decision

**Chosen option**: An inquiry inbox in the existing database, a narrow public ingestion endpoint, Resend owner alerts, Cloudflare Turnstile plus database rate limits, and a daily Vercel Cron retention job.

Reuse Next server rendered pages, the studio owner session, Neon, and Drizzle. Public components communicate with a dedicated API endpoint rather than importing studio modules. Keep the inquiry as the durable record and email as a secondary signal. No queue service, CRM service, webhook receiver, or payment feature is added.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) and `drizzle-orm` (`oakoss/agent-skills`, `.agents/skills/drizzle-orm/`). Existing studio and UI conventions remain authoritative.

## Rationale

Reasoning and alternatives are in [rationale.md](rationale.md).

## Feature design

### Confirmed choices and delegated recommendations

The engineer confirmed the public fields, `/contact`, free text budget, separate inbox, four statuses, owner email alerts, generic visitor confirmation, and retention on 2026-10-21. The engineer then authorized recommended choices for the rest of this architect run that day. The recommendations below, including the assembled data model and design ratification, use that authorization. It does not authorize coding, provider purchases, account creation, secret changes, or deployment.

### Public experience

Use the current site design, with no new design system or imagery. Order: page heading and short introduction, form, privacy notice, alternate contact links. Copy comes from a new `utils/data/contact-data.ts`; per page SEO copy stays in `utils/data/seo-data.ts`. Required fields after trimming: name 1 to 200 characters, email at most 320 matching the existing simple email shape, description 20 to 5000. Optional company is at most 200, budget at most 200. Reject control characters except normal description newlines and tabs. Treat every value as plain text; never render submitted HTML or Markdown.

The privacy notice says the details are used to review and respond to a project inquiry, stored in the private studio, and removed after the stated inactivity period if not converted. It states that converted contact details become client records. Do not claim legal certification or invent a reply deadline. Include a required acknowledgement, labelled as acknowledgement rather than marketing consent, and save notice version `lead-intake-v1`. No marketing subscription.

Success copy: “Thanks, your inquiry has been received.” No email delivery promise. The UI creates one cryptographically random UUID submission key on first submit, keeps it for retries and the unchanged draft, and resets it only after success or an explicit new inquiry. New values after a failed ambiguous attempt require an explicit new submission key. Never persist the form or its personal data in browser storage.

The form needs JavaScript for Turnstile. A noscript message and unavailable challenge state show the existing public email link. Reset the challenge after rejected or expired validation without clearing the fields.

### Data model

All new tables live in schema `studio`. One additive generated migration adds the model and constraints. Do not alter existing client lifecycle rules.

| Entity | Fields and rules | Relationships |
|---|---|---|
| `inquiries` | UUID `id`; required `workspace_id`, `submission_key` UUID, `payload_hash` SHA256, name, normalized lowercase email, description, `privacy_notice_version`; nullable company and budget; status default `new`; `created_at`, `updated_at`, `last_activity_at` default database time; nullable `converted_at`, `conversion_key` UUID, `conversion_hash`, `converted_client_id`, `converted_contact_id`, `converted_note_id` | One workspace has many inquiries; a converted inquiry links one client and contact, plus a note until that note is deleted; a client can have many converted inquiries |
| `inquiry_alerts` | One row per inquiry, unique `inquiry_id`; UUID id; state `pending`, `sending`, `accepted`, `failed`, or `unknown`; attempt generation integer starting 1; attempt count default 0; `updated_at` version; nullable lease UUID, lease expiry, first attempted time, `last_attempted_at`, provider message id, accepted time, safe error code; frozen sender, recipient, subject, body and provider key for the current generation | Inquiry has at most one alert row, cascading delete |
| `inquiry_events` | UUID id; workspace and inquiry ids; kind `submitted`, `reviewing`, `closed`, `reopened`, `converted`, or `alert_retry`; nullable actor user id for public submission; created time; no personal content or arbitrary metadata | Inquiry has many events, cascading delete; cleanup logs aggregate counts rather than a durable personal deletion history |
| `inquiry_rate_windows` | Primary key `(workspace_id, key_hash, window_start)`; integer count; database timestamp window; hash is HMAC of trusted address or normalized email with a private secret | Workspace scoped; no raw address or email; expired windows removed by cleanup |
| `inquiry_maintenance` | Workspace UUID primary key; `created_at` initialized on first production configuration validation; nullable `last_success_at`; nonnegative last deleted inquiry and rate window counts; nullable safe last error code; last outcome `never`, `complete`, `incomplete`, or `failed` | One workspace has at most one maintenance row; no visitor data |

Unique `(workspace_id, submission_key)` handles submission retries. Index inbox by `(workspace_id, status, created_at, id)` and retention by `(workspace_id, last_activity_at)` plus converted time. Checks enforce field lengths, status membership, lowercase email, positive attempt generations, and that conversion key/hash, client/contact links, and `converted_at` are all present exactly when status is `converted`. The optional converted note link uses `ON DELETE SET NULL`, so existing client note deletion still works. Composite foreign keys or transaction checks enforce that client, contact, note, and inquiry share a workspace and that contact and note belong to the selected client. Existing client archive rules remain in force.

Version is `updated_at::text`, preserving database microseconds. Owner status/conversion mutations update inquiry `updated_at` and `last_activity_at`; alert retries check and update their own alert version and timestamps, never inquiry activity. Converted source deletion never cascades into client tables. The saved inquiry fields are immutable; only status and conversion references change. Client/contact records continue to use existing archive rules; deleting a copied client note clears its provenance link rather than failing.

### Status and conversion rules

Allowed: `new` to `reviewing`, `closed`, or `converted`; `reviewing` to `closed` or `converted`; `closed` to `reviewing`. `converted` is final. Same state submits are harmless only for a recognized retry; otherwise return the current view without an event. Reads do not mark Reviewing automatically.

The conversion screen offers two modes. Existing client uses a paged search of live clients, with no automatic matching by company or email. New client name defaults to company if present, otherwise visitor name, and is editable before confirmation. New client status is `lead`. Selecting an existing client never changes that client's status.

Contact creation defaults to the visitor name and normalized email, editable before confirmation, and preferred channel `email`. If that client already has a live contact with the same email, link it without overwriting its data; show that choice in the preview. Otherwise create the contact and make it primary only if no live primary exists. Always create one client note, confirmed but not edited on the conversion form: `Portfolio inquiry received <time>`, a blank line, original description, and an optional blank line plus `Budget: <budget>`. Time uses existing `formatDateTime(created_at)` in `STUDIO_TIME_ZONE`. This bounded template stays below the existing 10000 character note limit; the client note may be edited or deleted afterwards using the existing client UI. No project, contract, or reply email is created by conversion.

Lock order for new mutations: workspace advisory transaction lock for inquiry owner mutations and cleanup, then existing client row if used, then inquiry row. New client name uniqueness uses the existing constraint. The conversion form generates a stable conversion UUID and retains it for retries. Store that key and a hash of fixed ordered normalized conversion inputs (mode, existing client id or proposed client name, contact name/email) in the conversion transaction. Under the workspace lock, first read the workspace scoped inquiry to resolve a completed conversion before any live client or stale version validation: the same conversion key/hash returns its saved client, including for create new mode and a client archived after conversion; a different key or hash returns `ALREADY_CONVERTED`. An unconverted inquiry continues through client and inquiry row locks in the stated order, then rechecks status, version, selected client workspace/archive state, and contact existence. All competing inquiry status/conversion/cleanup writes use the same workspace lock, so the preliminary inquiry read cannot race those operations. Never partially create a client, contact, or note.

### Public ingestion and abuse protection

`src/app/api/inquiries/route.ts` is the only unauthenticated business write entry point. It is outside `(site)` and `(studio)`. It calls a narrow server module `src/inquiries/ingest.ts`, which may use the existing server database connection and schema from `src/studio/db/` but must not import studio data reads, session functions, or `runInWorkspace()`. This is an explicit ingestion boundary, not an exemption for public pages or components. Public `(site)` code imports only a safe `src/inquiries/public-config.ts` and shared request types that contain no studio imports.

The target workspace comes only from private `LEAD_INTAKE_WORKSPACE_ID`, checked against an existing workspace and owner membership. Never accept workspace or recipient from request fields. Public modules never call `getWorkspaceId()` because no owner session exists. Studio reads use the existing session workspace in every query. API responses are noncached and generic.

Enforce a 64 KiB body limit while reading, JSON only, and exact Origin equal to configured `LEAD_INTAKE_ORIGIN` (localhost in local development). The byte limit accommodates the allowed Unicode text and token with JSON overhead. Field lengths on client and server use JavaScript UTF-16 `value.length`, matching existing studio validators and HTML maxlength; emoji can count as two units. This keeps the generated note and proposed client/contact names within existing conversion limits without changing studio rules. Reject absent or malformed origins. Do not enable cross origin access. Turnstile uses action `lead_intake`; verify server side with a 5 second timeout, require success, expected action and hostname from `LEAD_INTAKE_ORIGIN`, and reject timeout or uncertainty. Cloudflare test keys (amended 2026-10-21): Cloudflare answers its test secret with `success: true`, hostname `example.com`, `metadata.result_with_testing_key: true`, and no action, so the strict check can never pass locally. Outside production only (`config.production` false, which `getIntakeConfig` already allows only with the `1x0000000000000000000000000000000AA` secret and a localhost origin), `verifyChallenge` accepts a reply without checking action or hostname only when all of these hold: `response.ok`, `body.success === true`, `body.metadata?.result_with_testing_key === true` (read defensively, so a missing `metadata` simply fails this branch), and `config.turnstileSecret === "1x0000000000000000000000000000000AA"`. Any other reply outside production still takes the strict check. In production the strict check is unchanged, and a reply carrying `result_with_testing_key: true` is rejected even if every other field matches (defense in depth beside the existing test secret rejection in config). The branch lives inside `verifyChallenge`; no new environment flag is added. Tokens are single use and expire after five minutes. Browser challenge tokens are never saved or logged. Turnstile is bot protection, not the rate limiter.

Use only the Vercel supplied `x-vercel-forwarded-for` address on the Vercel production origin, not arbitrary forwarded headers. Require a single valid normalized IPv4 or IPv6 address; fail closed for a missing, multiple, or invalid value. Do not place another proxy in front without revisiting this trust rule. Hash it with HMAC SHA256 and `INQUIRY_RATE_SECRET`, with distinct `ip:` and `email:` input prefixes. Local tests use an explicitly injected test address. Before external validation, atomically count requests in fixed 10 minute windows, maximum 10 per address. After valid challenge, atomically permit at most 3 saved submissions per normalized email per UTC day, with no disclosure that an email has submitted before. Limits use database time and locks, not process memory. All configured limits are constants in one server module. No raw address is retained.

Canonical payload hashing uses a fixed ordered JSON array of normalized fields and notice version, excluding challenge and transient headers. After origin, body, and address limiting, check an existing submission key. Same payload returns generic success without another challenge or email; changed payload returns 409. For a new key, validate Turnstile, then increment the email quota and insert inquiry, submitted event, and pending alert in one transaction, protected by the submission unique index. A concurrent insert conflict rolls back that entire transaction including the quota increment, then resolves by reading only the hash under the fixed workspace. Use database UTC midnight for daily windows and floor UTC epoch seconds divided by 600 for address window starts. No public read endpoint is provided.

### Email alerts

Use Resend's HTTPS send endpoint through a small server adapter and native fetch, with a 5 second timeout. No new mail SDK is required. Sender and sole recipient come from server configuration. Subject is “New portfolio inquiry”; body is fixed generic text plus `${SITE_URL}/studio/inquiries/<uuid>`. Do not include name, email, company, description, budget, or a visitor Reply To header. A provider message id means accepted, not guaranteed delivery.

After commit, the public request awaits one best effort alert attempt. A process crash leaves `pending`; the studio filters pending and failed alerts. Claim an alert in a transaction with a 30 second lease and freeze the exact payload and key `lead-inquiry/<alert-id>/<generation>` before calling the provider. Record `last_attempted_at`, increase attempt count, and advance alert `updated_at` on every claim. Do not hold a database transaction during HTTP. Only the current lease owner may store a result. A stale sending lease is displayed and treated as `unknown`, not automatically failed. If cleanup already removed an expired alert, the result writer does nothing and never recreates it.

Explicit provider rejection becomes `failed`; transport timeout or interruption becomes `unknown`. Retrying within 23 hours of the generation's first attempt uses its exact frozen payload and key. After that safe window, a failed generation can start a new one; an unknown generation requires an owner confirmation that another alert may arrive before starting a new generation. The UI states this limitation plainly. Accepted alerts have no resend button. Never retry from the visitor's repeated submit. Manual retry is owner guarded and rate limited to one attempt per minute per inquiry. Changed sender configuration affects only a new generation, never a retry payload.

### Interface surface

| Surface | Inputs | Output | Access and errors |
|---|---|---|---|
| `GET /contact` | none | Public form, metadata, challenge site key, safe enabled flag | Public, no database read or secrets |
| `POST /api/inquiries` | submission UUID, fields, acknowledgement and notice version, challenge token | 200 generic success for saved/replayed submission; 422 field errors; 403 invalid origin/challenge; 409 key conflict; 413 body too large; 415 wrong type; 429 rate limit; 503 unavailable | No studio session; fixed configured workspace; response never includes submitted fields |
| `GET /studio/inquiries` | `status`, `alert`, `page` in the URL; search term from the `studio_inquiry_q` cookie | Rows, total, paging, unread status labels, safe alert state | Owner session; a `q` query parameter is ignored; invalid filters ignored; 50 rows per page, newest then id; paging links carry no term; no cache |
| `searchInquiriesAction` | form `q`, `status`, `alert` | Sets or clears the `studio_inquiry_q` cookie, then redirects to `/studio/inquiries` with only `status` and `alert` | Owner session checked before anything is stored; q trimmed to 100; an empty term clears the cookie |
| `GET /studio/inquiries/[id]` | UUID | Full inquiry, event timeline, alert state, client link if converted, version | Owner session; unknown or other workspace is 404 |
| `changeInquiryStatusAction` | id, version, target | Redirect detail or field error | Owner session; `STALE_RECORD`, `INVALID_TRANSITION`, not found |
| `GET /studio/inquiries/[id]/convert` | UUID, optional client search and page | Confirmable conversion form and paged existing client choices | Owner session; closed must reopen first; converted shows existing result |
| `convertInquiryAction` | id, version, conversion UUID, mode, client id or new client name, contact name/email | Redirect client detail | Owner session; duplicate client name, archived client, stale record, already converted |
| `retryInquiryAlertAction` | id, alert version, alert generation, confirmation of possible duplicate when required | Updated alert status on detail | Owner session; sending lease, cooldown, already accepted, generation/version conflict |
| `GET /api/internal/inquiries/cleanup` | Bearer `CRON_SECRET`, no workspace/body inputs | Count of deleted inquiries and expired rate windows, no ids | Production job only; missing or bad secret 401; no public caching |

Use the existing ActionState, coded errors, pending buttons, guarded redirects, loading/error/not found screens, and full precision edit version pattern. Inbox search matches literal case insensitive name, company, and email, not description; escape wildcard characters. Status defaults to all. Alert filter is all, needs attention (`pending`, `failed`, `unknown`, expired sending), or accepted. Empty inbox, empty filtered result, and invalid page have distinct messages. Inquiries link sits beside Clients in studio navigation. Visitor fields never enter query strings. Inbox search (amended 2026-10-21, AC-10): the search form posts to `searchInquiriesAction`, which keeps the term in the `studio_inquiry_q` cookie (`httpOnly`, `secure` on a secure origin, `sameSite: strict`, `path=/studio/inquiries`, 30 minutes, cleared by an empty search; see `inquirySearchCookieOptions` in `src/studio/auth/cookie.ts`). The list page reads the term only from that cookie, so a name or email typed into search never reaches the URL or the request log.

### Value sourcing

| Produced value | Source |
|---|---|
| Public name, description, company, budget | Trimmed validated request fields, stored immutable on inquiry |
| Email | Trimmed lowercase request email; existing contact comparison uses the same normalization |
| Workspace on public writes | `LEAD_INTAKE_WORKSPACE_ID`; never input or client cookie |
| Workspace on studio access | Existing verified owner session through `getWorkspaceId()` |
| Id, submission time, versions, activity time | UUID/database defaults and database timestamps; display in existing `STUDIO_TIME_ZONE` |
| Submission deduplication | Browser submission key and hash of fixed normalized payload |
| Client/contact/note links | Explicit conversion form and rows returned by the single conversion transaction |
| Default new client name | Inquiry company, else inquiry name, editable in conversion form |
| Alert recipient, sender, private link | Private configured recipient/sender and `SITE_URL` plus inquiry id |
| Alert state, version, cooldown, and message id | Frozen attempt record, alert `updated_at` and `last_attempted_at`, lease result, and sanitized provider response |
| Retention cutoff | Database current time minus interval `12 months`, compared with unconverted activity or conversion time |
| Challenge acceptance | Cloudflare siteverify reply: production requires `success`, action `lead_intake`, hostname of `LEAD_INTAKE_ORIGIN`, and no testing flag; outside production a `result_with_testing_key` reply with `success` is enough |
| Rate windows and expiration | Database UTC clock; HMAC of trusted address or normalized email |
| Public SEO | `SITE_URL`, new SEO data entry, and `PUBLIC_ROUTES` with `/contact` |

### Retention and security

Schedule `0 3 * * *` UTC in `vercel.json`, once daily in production. Cleanup uses a workspace advisory lock shared with conversion/status changes, deletes at most 1000 eligible inquiries per transaction in timestamp/id order, and repeats up to 10 batches per invocation. An overlapping job exits harmlessly if it cannot acquire the lock. Recheck each row's status, cutoff, and alert lease at delete time, so conversion wins or deletion wins without a partial conversion. Exclude a live sending lease; expired sending, unknown, and failed alert rows can expire with their parent. Claiming an alert also takes the workspace lock before inquiry and alert row locks so a claim cannot race cleanup selection. A result after deletion is discarded, not recreated. Delete rate windows older than 48 hours.

Upsert `inquiry_maintenance` during the first valid enabled production request or cleanup configuration check without resetting its `created_at`. Store aggregate counts and last outcome after each invocation, including partial progress. Set `last_success_at` only if no eligible backlog remains after processing. Hitting the batch cap or encountering a live lease on an otherwise eligible row records `incomplete`; an error records `failed`, leaving last success unchanged. The studio warns after 48 hours since last complete success, or since creation if no complete success exists. Expiry is eventual after the next successful daily run, not an exact minute guarantee. The cron entry point processes only configured intake workspace regardless of studio flag, requires a configured nonempty secret before constant time bearer comparison, and is disabled outside production. Local retention tests call the internal service with fake data rather than enabling a local public cleanup URL.

Inquiry source, events, and alerts expire together. Converted client notes and contact details are retained separately; conversion preview clearly states this. Existing archived contact retention remains a separate decision and is not silently solved here. Logs include only operation, safe error code, counts, and duration. No fields, raw address, challenge, session, provider token, database URL, or request body. No contact submit values in Vercel Analytics. Email contains no inquiry content to avoid creating another unmanaged copy.

Public writes require `LEAD_INTAKE_ENABLED=true` independently of `STUDIO_ENABLED`. With studio disabled, saved records remain safe but intake should normally also be disabled operationally; cleanup remains enabled. Preview intake is always disabled, even if flags are set. Local intake uses fake data only. Never weaken studio proxy/session checks for the public form.

### Configuration and release setup

- `LEAD_INTAKE_ENABLED`: private runtime flag; default false. Production and local only.
- `LEAD_INTAKE_WORKSPACE_ID`: existing workspace UUID, validated at server startup/use; no public override.
- `LEAD_INTAKE_ORIGIN`: exact accepted origin, production `SITE_URL`, local localhost origin.
- `TURNSTILE_SITE_KEY`: intentionally public site key passed by the page, no secret prefix.
- `TURNSTILE_SECRET_KEY`: private verification secret; local uses Cloudflare test keys (always pass, accepted through the testing reply rule above), production uses hostname restricted real keys and the strict action and hostname check.
- `RESEND_API_KEY`: private sending credential.
- `INQUIRY_ALERT_FROM`: verified sender mailbox. `INQUIRY_ALERT_TO`: owner's recipient mailbox. These actual values are configured by the owner, never guessed or committed.
- `INQUIRY_RATE_SECRET`: at least 32 random bytes for rate key hashing; distinct from session and cron secrets.
- `CRON_SECRET`: at least 32 random bytes protecting cleanup.

Owner setup before enabling production: verify an owned sending domain in Resend, configure the exact recipient, register a Turnstile widget restricted to the production hostname, and set the secrets. The shared `vercel.app` domain is not an owned email sending domain. No purchase or domain change is authorized by this spec. If no owned domain is available, keep intake disabled until the owner supplies an approved sending setup; do not silently swap providers or drop email alerts. Add these secret values to the leak check, required only when intake is enabled, and cover API responses in privacy verification. The existing guard still requires studio secrets according to current project rules.

### Critical test scenarios

- Valid submission, field errors, body cap, exact origin, expired/wrong hostname challenge, and retry with the same/changed payload, covering AC-1 through AC-4. Wrong action and wrong hostname are proven with a stubbed siteverify reply (unit level), since local Cloudflare test keys never return them; a live local UI submit proves the testing reply path end to end.
- Challenge reply matrix through `verifyChallenge` with a stub fetcher: testing reply accepted outside production and rejected in production; strict reply with wrong action or hostname rejected in both; `success: false`, non 200, malformed JSON, and timeout rejected in both, covering AC-3 and AC-11.
- Concurrent submit and contact conversion, duplicate client name, existing contact, archived client, target mismatch, and rollback after any write failure, covering AC-3, AC-6, AC-7.
- Email rejection, timeout, expired lease, accepted result, identical payload retry, and uncertainty beyond the 23 hour safe window, covering AC-4 and AC-8.
- Wrong workspace, signed out POST to every action, direct detail reads, disabled flags, preview bypass attempts, HTML injection, and sensitive log/bundle scan, covering AC-10 and AC-11.
- Month boundary retention, viewing without clock extension, close/reopen activity, converted source deletion without client deletion, overlapping cleanup and conversion, missing cron bearer, and cleanup health warning, covering AC-5, AC-9, AC-10.
- Both themes, 375px layout, keyboard form/error focus, list filters/paging/empty states, canonical, sitemap, and unchanged home section links, covering AC-1, AC-2, AC-5, AC-12.

## Build plan

1. Thin intake thread: migration including inquiry/alert/event/rate/maintenance tables; fake development fixtures; `/contact` form and safe public config; guarded ingestion with challenge, rate limit, and submission deduplication; signed in list/detail sufficient to see one saved fake inquiry. Covers AC-1 through AC-5, AC-10, AC-11.
2. Complete the inbox and conversion: filters, paging, state/version handling, event view, conversion preview and atomic client/contact/note creation or linking. Covers AC-5 through AC-7, AC-10.
3. Owner alerts and operations: Resend adapter, frozen attempt keys and leases, visible failed/unknown states, guarded manual retry, daily retention job and health status, configuration and secret checks. Covers AC-4, AC-8 through AC-11.
4. Polish and verify: themes, keyboard/error states, SEO and contact navigation, adversarial privacy checks, concurrency and failure tests, lint/build/leak check, fake local acceptance pass and owner production setup checklist. Covers AC-1 through AC-12. No real data or provider credentials in fixtures.
5. Verify fixes (from `/check verify` on 2026-10-21):
   - Challenge testing reply: in `src/inquiries/ingest.ts`, branch `verifyChallenge` on `config.production` as described under Public ingestion: outside production accept the testing reply only with `response.ok`, `success === true`, `metadata?.result_with_testing_key === true`, and the `1x…AA` test secret in config; in production keep the strict check and reject any testing reply. Add the challenge reply matrix tests to `src/inquiries/ingest.test.ts` (vitest, `npm test`, stub fetcher passed to `verifyChallenge`, both `production` values, plus a non test secret outside production taking the strict path). Then confirm a real local UI submit through `/contact` reaches the success confirmation, saves the fake inquiry, and creates the pending alert. Covers AC-2, AC-3, AC-4, AC-11.
   - Browser test timing: in `e2e/lead-intake.spec.ts`, the `toHaveURL(/\/studio\/clients\/[0-9a-f-]+$/)` expectation after Confirm conversion takes `{ timeout: 30_000 }`, because the first dev compile of `/studio/clients/[id]` takes about 10 s. Change only that expectation, not the global timeout, and rerun the browser suite to 4 of 4. Covers AC-12.

## Consequences

The inbox remains useful when email is unavailable. Deliberate conversion avoids polluting client tracking with spam. Public input is isolated from owner reads and immutable inquiry content remains traceable until retention removes it.

New provider setup and a daily job create operational work. A verified sending domain is a launch prerequisite, not a free assumption. Manual alert retry is simpler than a queue but requires attention, and provider acceptance does not prove delivery. Distributed exactly once email delivery is not promised after the provider deduplication window.

The public ingestion boundary is a deliberate addition to the studio's formerly owner only writes. It needs focused access tests and a narrow implementation. Client retention is still separate from inquiry retention.

## Follow-up

- [ ] Owner supplies sender/recipient and domain verification, Turnstile production keys, and deployment secrets before enabling intake.
- [ ] `/sync` records the narrow ingestion boundary, inquiry lifecycle, notification uncertainty, retention job, and new secrets in the appropriate context files.
- [ ] Mirror feature 25 and Design, Build, Verify, and Test tasks into Jira DP after tools load, searching existing work first. No duplicate issue is authorized.
- [ ] At implementation, consider official `resend/resend-skills@resend` for send and retry conventions. Discovery also found `resend/resend-skills@email-best-practices` and `cloudflare/skills@turnstile-spin`; the latter focuses on account setup. Neither a provider MCP connection nor extra skills are required for this design. Nothing was installed or connected.
- [ ] Optional later: visitor receipts, replying inside the studio, file attachments, automatic email retries, and spam classification. None is part of this slice.
