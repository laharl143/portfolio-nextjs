# 0020. Inquiry conversion tracking

**Date**: 2026-11-02
**Status**: Accepted

## Summary

When a visitor clicks a call to action to `/contact`, the site now remembers which one it was (in the browser tab's `sessionStorage`, a small store that lasts as long as the tab), and the contact form carries that location all the way through. The form sends three new analytics events: `inquiry_start` when the visitor first types in any field, `inquiry_sent` when the inquiry is saved, and `inquiry_failed` with a fixed reason code when it is not. Each event carries only the location and, for failures, the reason, never anything the visitor typed. The location is also saved on the inquiry row in a new nullable `source_location` column and shown on the studio inquiry page, so every sent inquiry can be traced to the call to action that brought it.

## Requirements

**User stories**:
- As the site owner, I want to see which call to action a sent inquiry came from, so that I know which page sections bring real leads.
- As the site owner, I want form starts, sends, and failures as separate dashboard events per location, so that I can see where visitors drop off.
- As a visitor, I want the form to work exactly as before and nothing I type to leave the site except through the form itself.

**Acceptance criteria**:
- **AC-1**: Clicking any call to action whose destination is `/contact` also stores `{ location, at }` (`at` is `Date.now()`) as JSON in `sessionStorage` under the key `ed:contact-location`. A later click replaces it (the last click wins). A click that fires `contact_click` but does not go to `/contact` (the mobile menu's `#contact` link on `/personal`) writes nothing. If `sessionStorage` is unavailable or throws, the click still navigates and `contact_click` still fires.
- **AC-2**: On `/contact`, the form reads the stored location once when it mounts. A value that is missing, not valid JSON, not in `CONTACT_LOCATIONS` (tampered or from an older build), or older than 30 minutes is treated as no location. Events then use `location: "direct"`, and the request sends no `sourceLocation`. After `inquiry_sent`, the form removes the key, so a later inquiry in the same tab ("Start another inquiry", or a later direct visit) counts as `direct` unless the visitor clicks a call to action again.
- **AC-3**: The first `input` event on any of the six form fields (name, email, company, budget, description, or the acknowledgement checkbox) fires `inquiry_start` with `{ location }` exactly once per draft. Focus alone, tabbing through fields, and the Turnstile widget (its hidden `cf-turnstile-response` input) do not fire it. Browser autofill does fire it, and that is accepted as a start. Editing again after a failed attempt or after "Edit draft (new submission)" does not fire it again. After "Start another inquiry" on the success state, the next first edit fires it again.
- **AC-4**: A `2xx` response from `POST /api/inquiries` fires `inquiry_sent` with `{ location }` once. The form classifies by `response.status` before it reads the body, so a `2xx` counts as sent even if the body cannot be parsed.
- **AC-5**: A failed attempt fires `inquiry_failed` with `{ location, reason }`, where `reason` is exactly one of: `validation` (422), `challenge` (403, a failed Turnstile check or a rejected origin), `rate_limited` (429), `server` (any other non `2xx` status, including 409, 413, 415, and 503), or `network` (the request threw before any response). Each failed attempt fires once, so a retry that fails again fires again. The dashboard therefore counts attempts, not drafts: a network failure followed by a successful retry shows one `inquiry_failed` and one `inquiry_sent`. Fields the browser blocks before sending (`required`, `minLength`) fire nothing, so `validation` covers only the server's 422.
- **AC-6**: The only properties any of the three events carry are `location` (a `CONTACT_LOCATIONS` value or `"direct"`) and, for `inquiry_failed`, `reason`. No field value, length, email domain, submission key, inquiry id, or status code number is ever sent to analytics.
- **AC-7**: The form sends `sourceLocation` in the `POST /api/inquiries` body when it has a valid location. The server keeps it only if it is in `CONTACT_LOCATIONS` and otherwise stores `null`. A missing, unknown, or malformed `sourceLocation` never rejects the inquiry and never changes the response.
- **AC-8**: `source_location` is excluded from the payload hash. Retrying the same draft (same `submissionKey`) with a different or missing `sourceLocation` is still the same submission, not a `KEY_CONFLICT`, and the first stored value is kept.
- **AC-9**: The studio inquiry detail page (`/studio/inquiries/[id]`) shows a "Source" row with a readable label for the stored location (for example "Hero call to action"). A stored code with no label (a location later removed from the list) shows the raw code. "Not recorded" is reserved for `null`, which includes every inquiry sent before this feature.
- **AC-10**: Nothing else changes for the visitor: the form fields, validation, Turnstile, pending, error, and success states (spec 0010, spec 0019), and the `/contact` URL (no query parameter is added to any link) all behave as before.

## Decision

Why, and the options weighed: [rationale.md](rationale.md). Verify checklist: [verify.md](verify.md).


**Chosen option**: Option 1: `sessionStorage` handoff, location stored on the inquiry

The call to action location travels to `/contact` in `sessionStorage`, rides on three new analytics events (`inquiry_start`, `inquiry_sent`, `inquiry_failed`) that carry only fixed codes, and is saved on the inquiry as `source_location` and shown in the studio.

**Implementation skills**: `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`)

## Feature design

**Data model sketch**:

One new column on the existing `studio.inquiries` table (spec 0010). No new table.

| Column | Type | Null | Rule |
|---|---|---|---|
| `source_location` | `text` | nullable | `null` means no call to action was recorded (direct visit, new tab, invalid value, or sent before this feature). Check `inquiries_source_location_check`: `source_location is null or source_location ~ '^[a-z_]{1,32}$'`. Not part of `payload_hash`. Never updated after insert. |

Drizzle: `sourceLocation: text("source_location")` in `src/studio/db/schema.ts`, the check added to the table's constraint list, and a migration generated with `npm run db:generate` (the next file drizzle-kit writes in `drizzle/`). Order matters: the insert in `ingest.ts` names the column, so an environment whose database lacks the migration answers every inquiry with a 500. Run `npm run db:migrate` on the Neon dev branch before local, `test:db`, and e2e runs. On Vercel, the build migrates before `next build`, so production gets the column before the new code serves. The studio reads use `i.*` (`inquiryColumns`), so they pick up the column without a query change, and only the row type gains `source_location`. Existing test fixtures that insert into `studio.inquiries` list their columns, so a new nullable column needs no change there. There is no backfill: existing rows stay `null`, which the studio shows as "Not recorded". Retention cleanup (spec 0011) deletes the column with its row, so nothing changes there.

Shared list: a new dependency free module `src/lib/contact-location.ts` exports `CONTACT_LOCATIONS` (the seven current values, `as const`), the `ContactLocation` type derived from it, `isContactLocation(value: unknown)`, `CONTACT_LOCATION_STORAGE_KEY = "ed:contact-location"`, `CONTACT_LOCATION_TTL_MS = 30 * 60 * 1000`, `rememberContactLocation(location)`, `readContactLocation()`, `forgetContactLocation()` (all three wrap storage in `try/catch`), and `CONTACT_LOCATION_LABELS` (location to studio label). `src/lib/analytics.ts` imports the type from there instead of declaring its own union, and re-exports it (`export type { ContactLocation }`) so existing imports such as `ContactLink.tsx` keep working and the existing names never change (spec 0018). `src/inquiries/rules.ts` imports `isContactLocation`. This module never imports from `src/studio/` or `src/inquiries/`.

**State transitions**: none. `source_location` is written once at insert. The form's draft has one flag, `started`: it starts `false`, becomes `true` on the first edit, and returns to `false` only when "Start another inquiry" is pressed. `newDraft()` serves both "Edit draft (new submission)" and "Start another inquiry" today, so it gains a parameter (`newDraft({ restart: true })` from "Start another inquiry" only), and only `restart` resets `started`.

**API surface**:

| Endpoint / function | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `POST /api/inquiries` (existing) | POST | existing body plus `sourceLocation: string` (opt) | unchanged | public (Origin, Turnstile, rate limits as today) | unchanged; an invalid `sourceLocation` is never an error |
| `parseSubmission()` in `src/inquiries/rules.ts` | function | `v.sourceLocation` | `Submission.sourceLocation: ContactLocation \| null`, computed as `isContactLocation(v.sourceLocation) ? v.sourceLocation : null`, never through `text()` (which throws) | server only | none new |
| `ingest()` insert in `src/inquiries/ingest.ts` | SQL | `input.sourceLocation` | `source_location` added to both the column list and the values of the hand written insert | server only | none new |
| `trackContactClick(location, { navigates = true } = {})` in `src/lib/analytics.ts` | function | `location`, `navigates` | `contact_click` event (unchanged) and, when `navigates`, `rememberContactLocation(location)`. `Header.tsx:162` passes `navigates: e.currentTarget.pathname === "/contact"`; every other caller already goes to `/contact` and uses the default | client | none, storage errors swallowed |
| `readContactLocation()` in `src/lib/contact-location.ts` | function | none (reads and parses `sessionStorage` in `try/catch`) | `ContactLocation \| null` (null when missing, invalid, or older than `CONTACT_LOCATION_TTL_MS`) | client | none |
| `forgetContactLocation()` | function | none | removes the key | client | none |
| `trackInquiryStart(location)` | function | `location: ContactLocation \| "direct"` | `track("inquiry_start", { location })` | client | none |
| `trackInquirySent(location)` | function | same | `track("inquiry_sent", { location })` | client | none |
| `trackInquiryFailed(location, reason)` | function | plus `reason: "validation" \| "challenge" \| "rate_limited" \| "server" \| "network"` | `track("inquiry_failed", { location, reason })` | client | none |
| studio inquiry read (`src/studio/data/inquiries.ts`) | SQL | adds `i.source_location` to `inquiryColumns` | `source_location: string \| null` on the row type | owner only (studio gate) | none new |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Call to action click | stored location | the `location` argument already passed to `trackContactClick` by `ContactLink`, `Header`, `Footer` |
| Form mount | form's location | `readContactLocation()`, called once in a mount `useEffect` and kept in a ref, so a later click in the same tab mid draft does not change it. The component also renders on the server, where `sessionStorage` does not exist, and reading in an effect keeps the read on the client only. The value is never rendered, so there is no hydration mismatch |
| Any event | `location` property | the form's location, or the literal `"direct"` when it is `null` |
| `inquiry_failed` | `reason` | derived in `submit()` from `response.status`, checked before the body is read: `422` → `validation`, `403` → `challenge`, `429` → `rate_limited`, other non `2xx` → `server`, a thrown `fetch` → `network`. `response.json()` moves into its own `try/catch`, so an unreadable body never changes the classification (a non `2xx` with an unreadable body keeps its status reason and shows the existing generic message) |
| `inquiry_sent` | clearing the stored location | `forgetContactLocation()` right after `trackInquirySent` |
| `inquiry_start` once per draft | the `started` flag | a `useRef(false)` in `ContactForm`. One `onInput` handler on the `<form>` element fires only when `event.target.name` is one of `name`, `email`, `company`, `budget`, `description`, `acknowledged`, then sets the flag. Only `newDraft({ restart: true })` resets it. While the form is frozen, `readOnly` fields and the checkbox's `preventDefault` emit no input, so a frozen draft cannot fire it |
| Request body | `sourceLocation` | the form's location, omitted when `null` |
| Insert | `source_location` | `Submission.sourceLocation` from `parseSubmission`: the value when `isContactLocation` passes, else `null` |
| Studio "Source" row | label | `CONTACT_LOCATION_LABELS[source_location]`, the raw code when a value has no label, or "Not recorded" for `null` |

Studio labels (in `CONTACT_LOCATION_LABELS`): `hero` "Hero call to action", `closing` "Closing call to action", `header` "Header Contact Me", `mobile_nav` "Mobile menu", `footer` "Footer Contact Me", `services` "Services section", `ecosystem` "Products teaser".

**Key invariants**:
- Analytics event properties are only `location` and `reason`, always from fixed lists (AC-6). Code review rule: the three `track*` helpers take typed codes only, never a string built from form data.
- `sourceLocation` never rejects an inquiry, and an invalid value becomes `null` (AC-7).
- `payloadHash()` is unchanged. `sourceLocation` is never in it (AC-8).
- `source_location` is written once at insert and never updated.
- Every `sessionStorage` access is inside `try/catch`, so storage errors never block navigation or the form.
- `inquiry_sent` fires only after a `2xx` response, never optimistically.

**Security model**:
- Public: the visitor can set any `sourceLocation` they like (it is client data). The impact is limited to a wrong attribution, because the server allowlists it, the database checks its shape, and it is never rendered as HTML except through React text in the studio.
- Owner only: the studio detail page reads it behind the existing studio gate. Public code still never imports from `src/studio/`.
- Privacy: no personal data in analytics (AC-6). The location is not personal data, and it follows the inquiry's 12 month retention (spec 0011). The privacy notice (`contactData.privacy`, `noticeVersion`) does not need to change: the site already says it uses Vercel Analytics, and these events add no new personal data. If you decide the notice should mention the stored source, bump `noticeVersion` in the same change.
- No new secrets. No `NEXT_PUBLIC_` variable.

**Configuration required**: none. Custom events need a Vercel plan that supports them, and the existing `contact_click` events already rely on that.

**Critical test scenarios**:
- Happy path (e2e, `e2e/lead-intake.spec.ts`): click the landing hero call to action, fill and submit the form with fake data, open the inquiry in the studio, and see "Source: Hero call to action". Verifies **AC-1**, **AC-7**, **AC-9**.
- Direct visit (e2e): go straight to `/contact` and submit. The studio shows "Not recorded". Verifies **AC-2**, **AC-9**.
- Events (Vitest + Testing Library, `ContactForm.test.tsx`, `track` mocked): a focus without input fires nothing. The first input fires `inquiry_start` once, and later input does not. A 201 fires `inquiry_sent`. 422, 403, 429, 500, and a thrown fetch fire `inquiry_failed` with `validation`, `challenge`, `rate_limited`, `server`, `network`. A 201 with an unreadable body still fires `inquiry_sent`. A sent inquiry clears the stored key. Input on the hidden Turnstile field fires nothing. "Start another inquiry" makes the next input fire `inquiry_start` again. Every call's properties are exactly `{ location }` or `{ location, reason }`. Verifies **AC-3**, **AC-4**, **AC-5**, **AC-6**.
- Storage failure (Vitest): with `sessionStorage` throwing, `trackContactClick` still calls `track("contact_click")`, and the form uses `"direct"`. A tampered value (`"<script>"`), invalid JSON, and an entry older than 30 minutes all read as `null`. `trackContactClick("mobile_nav", { navigates: false })` writes nothing. Verifies **AC-1**, **AC-2**.
- Server (Vitest, `rules.test.ts`): an unknown, numeric, or oversized `sourceLocation` gives `null` and no `IntakeError`, and `payloadHash` is identical with and without it. Verifies **AC-7**, **AC-8**.
- Retry (database test, `workflow.db.test.ts`): the same `submissionKey` sent twice with different `sourceLocation` values returns the original result, not `KEY_CONFLICT`, and the stored value is the first. Verifies **AC-8**.
- Regression: the existing lead intake and contact next steps e2e tests pass unchanged. Verifies **AC-10**.

## Build plan

Ordered as one thin end to end thread first (Tracer Bullet), then the remaining events and failure paths.

1. Add `src/lib/contact-location.ts` (`CONTACT_LOCATIONS`, type, `isContactLocation`, storage key, TTL, `rememberContactLocation`, `readContactLocation`, `forgetContactLocation`, labels). Point `src/lib/analytics.ts` at its type and re-export it, give `trackContactClick` the `navigates` option, and pass it from `Header.tsx:162`. Satisfies **AC-1**, **AC-2**.
2. Add `source_location` and its check to `src/studio/db/schema.ts`, generate the migration with `npm run db:generate`, and apply it to the Neon dev branch with `npm run db:migrate`. Satisfies **AC-7**, **AC-9**.
3. In `src/inquiries/rules.ts`, add `sourceLocation` to `Submission` and `parseSubmission` (allowlisted, else `null`) and leave `payloadHash` unchanged. In `src/inquiries/ingest.ts`, add it to the insert. Satisfies **AC-7**, **AC-8**.
4. In `ContactForm`, read the location once on mount and send `sourceLocation` in the body when present. Satisfies **AC-2**, **AC-7**.
5. Add `source_location` to `inquiryColumns` and the row type in `src/studio/data/inquiries.ts`, and add the "Source" row on `/studio/inquiries/[id]` using `CONTACT_LOCATION_LABELS`. That completes the thread from click to studio. Satisfies **AC-9**.
6. Add `trackInquiryStart`, `trackInquirySent`, and `trackInquiryFailed` to `src/lib/analytics.ts`. In `ContactForm`, wire `inquiry_start` (the gated form `onInput` plus the `started` ref, and `newDraft({ restart })`), restructure `submit()` to classify by status before reading the body, and fire `inquiry_sent` plus `forgetContactLocation()` on 2xx and `inquiry_failed` with the mapped reason otherwise. Satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
7. Tests: the unit, DOM, database, and e2e scenarios listed above, including the unchanged regression runs. Satisfies **AC-1** to **AC-10**.
8. Update `src/inquiries/AGENTS.md` (the `sourceLocation` rule and where the location list lives) through `/sync` after the build. Satisfies **AC-7**.

## Consequences

**Positive**:
- Each inquiry in the studio shows where it came from, and the dashboard shows start, sent, and failed counts per location, so you can compare calls to action by real leads instead of clicks.
- Failure reasons show where the form itself loses people.
- One list (`CONTACT_LOCATIONS`) now drives the click event, the form, the server allowlist, and the studio labels.

**Negative / tradeoffs**:
- New tab clicks and visitors who block storage count as `direct`, so attribution undercounts a little.
- Last click wins within 30 minutes in a tab: a visitor who clicked the hero, left, and typed `/contact` in the same tab a few minutes later is still attributed to the hero.
- Browser autofill counts as a form start.
- `inquiry_failed` counts attempts, not drafts, so failures can outnumber the drafts that failed.
- The dashboard does not compute a conversion rate. You compare the `inquiry_start` and `inquiry_sent` counts per location by eye or in an export.
- One more column on the public write path means one more value the server must validate.

**Neutral**:
- One migration, with no backfill and no change to retention or the leak check.
- A new call to action location needs only a new entry in `CONTACT_LOCATIONS` and `CONTACT_LOCATION_LABELS`. No migration is needed, because the database check is a shape check.
- `track()` does nothing outside Vercel, so local runs and tests rely on the mocked `track`.

## Follow-up

- [ ] After the build, `/sync` adds the `sourceLocation` rule to `src/inquiries/AGENTS.md` and the shared location list to root `AGENTS.md` (the landing page rule that names `contact_click`).
- [ ] Optional later: a "Source" column or filter on the studio inbox list, if detail page only proves too slow to scan.
