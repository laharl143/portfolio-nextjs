# 0005. Studio login: owner passkey sign in with database sessions

**Date**: 2026-10-19
**Status**: Accepted

## Summary

You sign in to the private studio with a passkey (a key pair your device or password manager keeps, unlocked with Face ID, Windows Hello, or a PIN), so there is no password or code anyone can guess. The server keeps each sign in as a row in the `studio` schema and puts only a random token in an HttpOnly cookie (a cookie scripts in the page cannot read). A sign in lasts 30 days and every visit extends it. The first passkey, and any recovery after losing your devices, goes through a one time setup token you set in Vercel and then remove. Every studio page and every studio server action checks the session, and a signed out visitor lands on `/studio/login`. The login screen borrows the look of the vital-stats admin card, with one passkey button instead of the keypad.

## Requirements

**User stories**:
- As Ed, I want to sign in with a passkey, so that nobody can guess or phish their way into my client data.
- As Ed, I want a sign in to last a month on my own devices, so that I rarely have to sign in again.
- As Ed, I want to sign out here or everywhere, so that a lost laptop never keeps access.
- As Ed, I want a safe way to register my first passkey and to recover if I lose every device, so that I am never locked out and nobody else can enroll.
- As Ed, I want every studio query scoped to the workspace of my session, so that the studio is ready to grow into my CRM and Invoicing products.

**Acceptance criteria**:
- **AC-1**: With `STUDIO_ENABLED=true`, a visitor with no valid session who opens any studio page (`/studio` or anything under it, except `/studio/login` and `/studio/setup`) is redirected to `/studio/login?next=<the path they asked for>` and sees no studio data. A cookie that is missing, unknown, or expired counts as no valid session.
- **AC-2**: A studio server action invoked with no valid session reads and writes nothing and ends in a redirect to `/studio/login`. This holds for actions on every signed in page, not just for page renders.
- **AC-3**: With `STUDIO_ENABLED` unset or anything other than `"true"`, every studio URL, including `/studio/login` and `/studio/setup`, still returns 404 exactly as in spec 0003.
- **AC-4**: `/studio/setup` returns 404 unless `STUDIO_SETUP_TOKEN` is set with at least 32 characters (a shorter value counts as unset). When it is set, the page asks for the token. A correct token lets you register a passkey and signs you in. A wrong token registers nothing, shows "That token is not valid.", and writes a `setup_rejected` event. After 5 `setup_rejected` events within 15 minutes, every setup attempt (even with the right token) is refused for the rest of that window. A successful setup is also the recovery path: in one transaction it deletes every existing passkey and every session of the owner, inserts the new passkey, and creates the new session, then writes a `setup_used` event. A lost device's passkey stops working the moment setup succeeds. If verification fails, nothing is deleted.
- **AC-5**: On `/studio/login`, choosing "Sign in with passkey" and completing the device prompt with a passkey registered in this environment creates a session with a freshly generated token, sets the session cookie, and lands on `next` when `next` is a safe studio path (rule in Key invariants), else on `/studio`. If the browser already carried a valid session cookie, that old session row is deleted. It writes a `sign_in` event and updates that passkey's `counter` and `last_used_at`.
- **AC-6**: Sign in failures leave you on the login page with the message from the Messages table, and create no session. A cancelled or timed out prompt is caught in the browser (both raise `NotAllowedError`, shown as one message) and makes no server call, so it writes no event. Every failure the server sees (`UNKNOWN_PASSKEY`, `VERIFICATION_FAILED`, `CHALLENGE_EXPIRED`) writes a `sign_in_failed` event. A browser without passkey support sees the unsupported message with the button disabled.
- **AC-7**: A session lasts 30 days from its last use. When `last_seen_at` is more than 24 hours old, a guarded request moves `last_seen_at` to now and `expires_at` to now plus 30 days (at most one write per session per day). A session past `expires_at` is signed out. Each studio request that carries the cookie gets it again with a fresh 30 day `Max-Age`.
- **AC-8**: "Sign out" deletes this session's row, clears the cookie (same name, `Path`, and `Secure` attributes, `Max-Age` 0), writes a `sign_out` event, and lands on `/studio/login`. "Sign out everywhere" deletes every session of the owner, clears the cookie, writes a `sign_out_all` event, and lands on `/studio/login`. Afterwards no old cookie works on any device.
- **AC-9**: Signed in, `/studio/security` shows "You have 1 passkey" or "You have N passkeys" and an "Add another passkey" button. Completing the device prompt registers a new passkey (nickname from the browser label) that works for sign in afterwards, shows "Passkey added.", and writes a `passkey_added` event. An authenticator that already holds a studio passkey is refused with the `ALREADY_REGISTERED` message (the add flow passes the owner's passkeys as `excludeCredentials`).
- **AC-10**: Each auth event above is a row in `studio.auth_events` with its kind, owner (when known), passkey id (when known), browser label, and time. On each successful sign in, events older than 90 days and expired sessions are deleted.
- **AC-11**: `getWorkspaceId()` returns the `workspace_id` of the current session, so every data layer read and insert is scoped by the signed in session. The seed script still works with no session, through an explicit workspace scope.
- **AC-12**: Already signed in, opening `/studio/login` redirects to `/studio`.
- **AC-13**: No credential or secret is in the repo. `.env.example` lists `STUDIO_RP_ID`, `STUDIO_ORIGIN`, and `STUDIO_SETUP_TOKEN`, all empty. When `VERCEL_ENV` is `production` and `STUDIO_ENABLED` is `"true"`, the build fails (in `scripts/check-studio-leak.mjs`) when `STUDIO_RP_ID` or `STUDIO_ORIGIN` is missing, when `STUDIO_ORIGIN` is not `https://`, or when its host is neither `STUDIO_RP_ID` nor a subdomain of it. When `STUDIO_SETUP_TOKEN` is set, the leak check also fails the build if its value appears in public output.
- **AC-14**: The login and setup screens follow the vital-stats admin card (rules in Feature design, UX surface), work in light and dark theme, are `noindex, nofollow`, and are reachable by keyboard with a visible focus state.

## Decision

**Chosen option**: Option 1: Passkeys through SimpleWebAuthn, with sessions you own in the `studio` schema.

The studio signs in its single owner with a discoverable passkey verified by `@simplewebauthn/server`, stores opaque hashed session tokens in `studio.sessions`, and enforces them in `requireStudioAccess()` for every studio page and server action, with a one time setup token for the first passkey and for recovery.

**Implementation skills**: `drizzle-orm` (`oakoss/agent-skills`, `.claude/skills/drizzle-orm/`) · `neon-postgres` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn-ui` (`jezweb/claude-skills`, `.claude/skills/shadcn-ui/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Settled choices

Picked by you in the design conversation: passkeys (vital-stats card look, not its keypad), redirect to login when signed out, 30 day sliding sessions, sign out here plus sign out everywhere, SimpleWebAuthn with your own sessions, a one time setup token for bootstrap and recovery, studio off in Preview, a `workspace_members` join table, challenges in a table with a 5 minute expiry, an `auth_events` table kept 90 days, browser label only (no IP), a passkey name of "Erskine Duenas (studio)", "Add another passkey" as the only management feature, server actions, RP config from env vars, **user verification `preferred`**, and a cookie presence check in the proxy.

Settled by recommendation (you asked for the recommended pick on everything after the transport round):

| Item | Pick | Why | Runner up |
|---|---|---|---|
| Discoverable credential | `residentKey: "required"` | Sign in needs no username; the device offers the studio passkey. | `preferred` (could create a passkey that cannot sign in without a username) |
| Attestation | `"none"` | One owner, no device allow list; attestation only adds privacy cost. | `"direct"` |
| Algorithms | SimpleWebAuthn defaults (EdDSA, ES256, RS256) | Covers every platform authenticator. | ES256 only (drops some Windows Hello keys) |
| Session token | 32 random bytes, base64url in the cookie; SHA-256 hex in `token_hash` | A database leak gives no usable cookie. Opaque, so revocation is a row delete. | Signed JWT (cannot be revoked without a deny list) |
| Cookie | When `STUDIO_ORIGIN` starts with `https://`: `__Host-studio_session` with `Secure`; otherwise `studio_session` without `Secure`. Always `HttpOnly`, `SameSite=Lax`, `Path=/` | Keyed on the origin, not `NODE_ENV`, so `next start` over `http://localhost` still works in Safari and Firefox. The `__Host-` prefix pins it to this exact host. `Lax` survives following a link into the studio; Next checks the `Origin` of server action POSTs. | `SameSite=Strict` (breaks opening a studio link from email or chat) |
| Cookie lifetime | Proxy sets it again (same value and the same attributes as above, `Max-Age` 30 days) on the response of each studio request that carries it, including login and setup; `expires_at` in the database is the real limit | Keeps the cookie alive as long as the session slides, with no database call in the proxy. A stale cookie being refreshed is harmless: the guard rejects it. | `Max-Age` 400 days, set once |
| Setup token entry | Typed or pasted into a field on `/studio/setup`, never in the URL | Query strings end up in history and logs. | `?token=` link (what the panel described; changed for that reason) |
| Setup token check | Compare SHA-256 digests with `crypto.timingSafeEqual` | Constant time, no length leak. | Plain string compare |
| Recovery effect | Successful setup deletes every existing passkey and every session, in the same transaction that inserts the new passkey, and only after verification passes. Setup passes an empty `excludeCredentials`, so you can enroll again on a device you still have | If you are recovering, assume a device is lost; its passkey must stop working too. Doing it after verification means a botched attempt cannot sign you out. | Keep old passkeys (recovery would leave the lost device working) |
| Setup throttle | 5 `setup_rejected` events in 15 minutes locks setup (global, counted from `auth_events`). Check order in `startSetup` and `finishSetup`: flag, token set and at least 32 characters (else 404 / `SETUP_CLOSED`), lock, digest compare, then record the event | Uses the table you already have. Accepted cost: anyone who finds `/studio/setup` while a token is set can keep it locked by sending 5 bad tokens every 15 minutes; the token only exists for minutes at a time, so this is acceptable. | Vercel Firewall rate limit rule (dashboard config outside the repo) |
| Challenge flood | No cap. Expired challenge rows are deleted on every insert | A cap would let a stranger lock you out of sign in by filling it. The table stays bounded to about five minutes of attempts. If abuse ever shows up, add a Vercel Firewall rate limit on `/studio/login`. | A global cap (rejected: it is a lockout lever) |
| Redirect path source | Proxy sets request header `x-studio-pathname` to the pathname plus search string, through `NextResponse.next({ request: { headers } })`, overwriting any incoming one; guard reads it through `headers()` and passes it through `safeNext()` | Server components cannot see the URL; the proxy can. Keeping the search string returns you to the exact view. | Always redirect to plain `/studio/login` |
| Workspace scope for scripts | `runInWorkspace(workspaceId, fn)` in `workspace.ts` using `AsyncLocalStorage`; `getWorkspaceId()` checks it first, then the session | Data function signatures stay the same; the seed wraps its body once. | A `workspaceId` parameter on every data function |
| Browser label | A small own function `deviceLabel(userAgent)` returning `<browser> on <os>`. Browser checked in order Edge (`Edg/`), Opera (`OPR/`), Chrome, Firefox, Safari; OS in order iOS (`iPhone`, `iPad`), Android, Windows, macOS, Linux. Unknown parts become "Unknown browser" or "unknown OS"; result cut to 60 characters | No dependency for a cosmetic label. | `ua-parser-js` |
| Request dedupe | `getStudioSession()` wrapped in React `cache()` | The layout, page, and data layer share one session lookup per request. | Look it up each call |
| Slide write failure | The slide `update` runs in a `try/catch` and a failure is ignored; the lookup itself still fails closed | A database hiccup during the once a day write must not sign you out. | Fail the request |
| Encoding | `isoBase64URL` from `@simplewebauthn/server/helpers` for public keys and user handles; `counter` uses Drizzle `bigint(..., { mode: "number" })` | One set of helpers, and counters stay plain numbers. | Node `Buffer` base64url |
| User handle check | `finishSignIn` rejects (`VERIFICATION_FAILED`) when the response's `userHandle` is present and does not decode to `STUDIO_OWNER_ID` | Cheap sanity check against a mixed up credential. | Skip it |
| RP name | Code constant `STUDIO_RP_NAME = "Erskine Studio"` | Not a secret, never differs by environment. | An env var |

### Data model sketch

Five new tables in the Postgres schema `studio`, one migration. Existing tables do not change.

| Table | Column | Type | Null | Notes |
|---|---|---|---|---|
| `owners` | `id` | uuid | no | PK. Fixed `STUDIO_OWNER_ID = 00000000-0000-4000-8000-000000000002`, inserted by the migration. Also the WebAuthn user handle (random looking, no personal data). |
| | `display_name` | text | no | `Erskine Duenas (studio)`, set by the migration; check not blank |
| | `created_at`, `updated_at` | timestamptz | no | the shared `timestamps` helper |
| `workspace_members` | `workspace_id` | uuid | no | FK `workspaces.id`, on delete restrict |
| | `owner_id` | uuid | no | FK `owners.id`, on delete cascade |
| | `role` | text | no | default `owner`; check in (`owner`) |
| | `created_at` | timestamptz | no | |
| | | | | PK (`workspace_id`, `owner_id`). Migration inserts (`STUDIO_WORKSPACE_ID`, `STUDIO_OWNER_ID`, `owner`). Index on `owner_id`. |
| `passkeys` | `id` | text | no | PK. Credential id, base64url. |
| | `owner_id` | uuid | no | FK `owners.id`, on delete cascade; index |
| | `public_key` | text | no | base64url of the COSE public key |
| | `counter` | bigint | no | default 0; check `>= 0` |
| | `transports` | text[] | yes | as reported by the browser |
| | `device_type` | text | no | check in (`singleDevice`, `multiDevice`) |
| | `backed_up` | boolean | no | |
| | `nickname` | text | no | browser label at registration; check not blank |
| | `created_at` | timestamptz | no | |
| | `last_used_at` | timestamptz | yes | set on each sign in |
| `sessions` | `id` | uuid | no | PK, `defaultRandom()` |
| | `token_hash` | text | no | unique index `sessions_token_hash_uq`; SHA-256 hex of the cookie token |
| | `owner_id` | uuid | no | index (no single column FK; covered by the composite) |
| | `workspace_id` | uuid | no | (no single column FK; covered by the composite) |
| | | | | composite FK `sessions_membership_fk` (`workspace_id`, `owner_id`) → `workspace_members` (`workspace_id`, `owner_id`), on delete cascade, through Drizzle `foreignKey({ columns, foreignColumns })`. A session always belongs to a real membership, and removing the owner removes the membership and its sessions. |
| | `device_label` | text | yes | browser label |
| | `created_at`, `last_seen_at` | timestamptz | no | default now |
| | `expires_at` | timestamptz | no | index; check `expires_at > created_at` |
| `auth_challenges` | `id` | uuid | no | PK; its value travels in the `studio_challenge` cookie |
| | `challenge` | text | no | base64url, from SimpleWebAuthn |
| | `purpose` | text | no | check in (`register`, `authenticate`) |
| | `owner_id` | uuid | yes | FK `owners.id`, on delete cascade; set for `register`, null for `authenticate` |
| | `created_at` | timestamptz | no | |
| | `expires_at` | timestamptz | no | created plus 5 minutes; index |
| `auth_events` | `id` | uuid | no | PK |
| | `kind` | text | no | check in (`sign_in`, `sign_in_failed`, `sign_out`, `sign_out_all`, `passkey_added`, `passkey_removed`, `passkey_renamed`, `setup_used`, `setup_rejected`); the last two passkey kinds are unused until those features exist, added now so they need no migration |
| | `owner_id` | uuid | yes | FK `owners.id`, on delete set null |
| | `passkey_id` | text | yes | plain text, no FK, so history survives a passkey removal |
| | `device_label` | text | yes | |
| | `created_at` | timestamptz | no | index; also index (`kind`, `created_at`) for the setup throttle |

The owner and membership rows are data, which `drizzle-kit generate` does not emit: append them by hand at the end of the generated `0005` SQL file, after the `create table` statements, as `insert ... on conflict do nothing` with the fixed ids (the same way migration `0002` inserted the workspace).

Relationships: `owners` 1:N `passkeys`, `owners` 1:N `sessions`, `owners` N:M `workspaces` through `workspace_members`, `workspace_members` 1:N `sessions`, `owners` 1:N `auth_challenges`, `owners` 1:N `auth_events`.

### State transitions

Session: created (sign in or setup) → active → slid forward (any guarded request, once a day) → ended (sign out, sign out everywhere, setup, or `expires_at` passed). An ended session is a deleted row, or an expired row cleaned on the next sign in.

Challenge: created (`start*`) → consumed (deleted by its `finish*`, success or failure) or expired (deleted by the next insert).

### Route layout

The current studio root layout calls `requireStudioAccess()`, which would also guard the login page and loop. Restructure:

- `src/app/(studio)/layout.tsx`: root layout calls `requireStudioEnabled()` (flag only).
- `src/app/(studio)/studio/(signed-in)/layout.tsx`: calls `requireStudioAccess()` and renders the studio header (name, "Security" link, "Sign out", "Sign out everywhere").
- `src/app/(studio)/studio/(signed-in)/page.tsx`: the current shell page, moved; still calls `requireStudioAccess()` itself.
- `src/app/(studio)/studio/(signed-in)/security/page.tsx`: the security page.
- `src/app/(studio)/studio/(auth)/login/page.tsx` and `(auth)/setup/page.tsx`: call `requireStudioEnabled()` only.

### API surface

All are server actions in `src/studio/auth/actions.ts` (`"use server"`), plus the guard functions. Module code lives in `src/studio/auth/` (`webauthn.ts`, `session.ts`, `events.ts`, `device-label.ts`, `config.ts`), each starting with `import "server-only"` and `import "@/studio/marker"`. The one exception is `cookie.ts` (cookie name and attributes only), which the proxy imports.

| Function | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `requireStudioEnabled()` (`guard.ts`) | guard | none | `void` | flag | `notFound()` when the flag is off |
| `requireStudioAccess()` (`guard.ts`) | guard | cookie, `x-studio-pathname` | `Promise<StudioSession>` (`sessionId`, `ownerId`, `workspaceId`) | flag + valid session | `notFound()` when flag off; `redirect("/studio/login?next=…")` when signed out |
| `getStudioSession()` (`session.ts`) | read, `cache()` | cookie | `StudioSession \| null`; slides the session when due | none (internal) | none, a database error propagates (fail closed) |
| `startSignIn()` | action | none | `PublicKeyCredentialRequestOptionsJSON` | flag | none |
| `finishSignIn(response, next)` | action | `AuthenticationResponseJSON` (req), `next: string` (opt) | redirect to safe `next` or `/studio` | flag | `UNKNOWN_PASSKEY`, `VERIFICATION_FAILED`, `CHALLENGE_EXPIRED` |
| `startSetup(token)` | action | `token: string` (req) | `PublicKeyCredentialCreationOptionsJSON` | flag + `STUDIO_SETUP_TOKEN` set | `SETUP_CLOSED` (404 page), `INVALID_TOKEN`, `SETUP_LOCKED` |
| `finishSetup(token, response)` | action | `token` (req, held in the setup page's client state between the two steps, never in a cookie), `RegistrationResponseJSON` (req) | one transaction: delete all passkeys and sessions, insert passkey, create session; then redirect `/studio/security` | flag + token checked again | `SETUP_CLOSED`, `INVALID_TOKEN`, `SETUP_LOCKED`, `VERIFICATION_FAILED`, `CHALLENGE_EXPIRED` |
| `startAddPasskey()` | action | none | `PublicKeyCredentialCreationOptionsJSON` | `requireStudioAccess()` | redirect when signed out |
| `finishAddPasskey(response)` | action | `RegistrationResponseJSON` (req) | `{ ok: true, count }` | `requireStudioAccess()` | `VERIFICATION_FAILED`, `CHALLENGE_EXPIRED`, `ALREADY_REGISTERED` |
| `signOut()` | action | none | redirect `/studio/login` | `requireStudioAccess()` | none |
| `signOutEverywhere()` | action | none | redirect `/studio/login` | `requireStudioAccess()` | none |
| `getWorkspaceId()` (`data/workspace.ts`) | read | none | `Promise<string>` | caller guarded | throws `NoWorkspaceScope` when neither a scope nor a session exists |
| `runInWorkspace(id, fn)` (`data/workspace.ts`) | scope | `id: string`, `fn` | `fn`'s result | scripts only | none |

Actions return `{ ok: false, code }` for expected errors (never throw them to the client), and the client maps `code` to the Messages table below. `finishSignIn` and `finishSetup` call `redirect()` on success after setting the cookie, and that call sits outside any `try/catch` (it works by throwing). Each `finish*` action deletes the `studio_challenge` cookie whatever the outcome.

Registration options: `rpName` `STUDIO_RP_NAME`, `rpID` `STUDIO_RP_ID`, `userID` the bytes of `STUDIO_OWNER_ID` (a `Uint8Array`), `userName` and `userDisplayName` `owners.display_name`, `attestationType: "none"`, `excludeCredentials` empty for setup and the owner's passkeys for add another, `authenticatorSelection: { residentKey: "required", userVerification: "preferred" }`. Authentication options: `rpID`, empty `allowCredentials`, `userVerification: "preferred"`. Verification (v13 shapes): `expectedChallenge` from the consumed row, `expectedOrigin` `STUDIO_ORIGIN`, `expectedRPID` `STUDIO_RP_ID`, `requireUserVerification: false`; for sign in, `credential: { id, publicKey: isoBase64URL.toBuffer(public_key), counter, transports }` from the `passkeys` row whose `id` equals `response.id`.

Order inside `finishSignIn`: consume the challenge, look up the passkey, verify, then in one transaction update `counter` and `last_used_at`, delete the old session row if the incoming cookie was valid, and insert the new session. Then set the cookie, write the event, purge old events and expired sessions, and redirect. `finishAddPasskey` inserts its passkey in one statement after verification.

**Messages** (the only user facing error text):

| Code or state | Where | Message |
|---|---|---|
| prompt cancelled or timed out (`NotAllowedError`, browser only) | login, setup, security | "Sign in was cancelled. Try again." (setup and security: "Passkey setup was cancelled. Try again.") |
| no WebAuthn support (browser only) | login, setup, security | "This browser does not support passkeys." |
| `UNKNOWN_PASSKEY` | login | "This passkey is not registered for this studio." |
| `VERIFICATION_FAILED`, `CHALLENGE_EXPIRED` | login | "Sign in failed. Try again." |
| `VERIFICATION_FAILED`, `CHALLENGE_EXPIRED` | setup, security | "Passkey setup failed. Try again." |
| `INVALID_TOKEN` | setup | "That token is not valid." |
| `SETUP_LOCKED` | setup | "Too many attempts. Try again in 15 minutes." |
| `SETUP_CLOSED` | setup (token removed between steps) | "Setup is closed." |
| `ALREADY_REGISTERED` (`InvalidStateError` in the browser, or the server's duplicate id check) | security | "This device already has a studio passkey." |
| success | security | "Passkey added." |
| waiting | all | button text "Waiting for your passkey…", disabled |

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| any `start*` | challenge | generated by SimpleWebAuthn `generate*Options`, stored in `auth_challenges.challenge` |
| any `start*` | challenge id cookie `studio_challenge` | `auth_challenges.id`; `HttpOnly`, `SameSite=Strict`, `Max-Age` 300, `Path=/studio` |
| any `finish*` | expected challenge | `delete from auth_challenges where id = <cookie> and purpose = <expected> and expires_at > now() returning challenge` (one use, atomic) |
| any `finish*` | expected origin, RP ID | `STUDIO_ORIGIN`, `STUDIO_RP_ID` env vars (read in `config.ts`) |
| `startSetup`, `startAddPasskey` | user handle, names | `STUDIO_OWNER_ID` constant; `owners.display_name` |
| `finishSignIn` | which owner | `passkeys.owner_id` of the row whose `id` equals the response's credential id |
| `finishSignIn`, `finishSetup` | session `workspace_id` | the owner's `workspace_members` row, oldest `created_at` first (one row today) |
| `finishSignIn`, `finishSetup` | session `expires_at` | database `now()` plus 30 days |
| `finishSignIn` | updated `counter` | `verification.authenticationInfo.newCounter` |
| `finishSetup`, `finishAddPasskey` | passkey columns | `verification.registrationInfo`: `credential.id`, `credential.publicKey` (base64url), `credential.counter`, `credential.transports`, `credentialDeviceType`, `credentialBackedUp` |
| `finishSetup`, `finishAddPasskey` | passkey `nickname` | `deviceLabel(user-agent header)` |
| every event and session | `device_label` | `deviceLabel(user-agent header)` from `headers()` |
| `finishSignIn` | `next` target | the `next` search param the login page received, passed to the action, checked by `safeNext()` |
| guard redirect | `next` path | `x-studio-pathname` request header set by the proxy; `/studio` when missing |
| `startSetup` | token validity | `STUDIO_SETUP_TOKEN` env var compared with the typed token (digest, constant time) |
| `startSetup`, `finishSetup` | lock state | count of `auth_events` where `kind = 'setup_rejected'` and `created_at > now() - 15 minutes` |
| `getStudioSession()` | the session | cookie value → SHA-256 hex → `sessions.token_hash`, with `expires_at > now()` |
| `getStudioSession()` | slide due | `last_seen_at < now() - 24 hours` |
| `/studio/security` | passkey count | `count(*)` of `passkeys` for the session's owner |
| `getWorkspaceId()` | workspace id | the `runInWorkspace` scope if present, else `getStudioSession().workspaceId` |
| seed script | workspace id | `STUDIO_WORKSPACE_ID` constant, passed to `runInWorkspace` |
| proxy, session code | cookie name and `Secure` flag | `STUDIO_ORIGIN` starts with `https://` → `__Host-studio_session` with `Secure`, else `studio_session` without (one shared function in `src/studio/auth/cookie.ts`, which has no `server-only` import, so the proxy can use it; it holds no secret) |
| login page (AC-12) | already signed in | `getStudioSession()` (not `requireStudioAccess()`), redirect to `/studio` when it returns a session |
| studio header | items | display name from `owners.display_name`, links "Studio" (`/studio`) and "Security" (`/studio/security`), buttons "Sign out" and "Sign out everywhere" as `<form action>` submits, each disabled while pending |

### Key invariants

- The raw session token never reaches the database or a log; only its SHA-256 hex does.
- A challenge is used at most once: the `finish*` actions consume it with a single `delete ... returning`, so two parallel verifies cannot both pass.
- `safeNext(value)` accepts a value only if all hold: it is exactly `/studio` or starts with `/studio/` or `/studio?`; it contains no `\`, no `//`, no `..` path segment, and no control or whitespace character (code points below 0x21, and 0x7f); its pathname is not `/studio/login` or `/studio/setup` or under them. Anything else becomes `/studio`. It runs on the `next` action argument and on the `x-studio-pathname` header alike.
- `getStudioSession()` never calls `cookies().set()` (cookies can only be written in actions, route handlers, and the proxy). Only the proxy refreshes the cookie; only actions create or clear it.
- `runInWorkspace()` is for scripts only. No page, layout, action, or `src/studio/data/` function calls it; a scoped call from request code would bypass the session.
- A session's (`workspace_id`, `owner_id`) is always a `workspace_members` row (composite FK).
- Every action, page, and layout under `(signed-in)` calls `requireStudioAccess()` before any read or write. Login and setup actions call `requireStudioEnabled()` first.
- `getWorkspaceId()` never falls back to a constant. With no scope and no session it throws.
- Setup never registers a passkey without a valid token checked in both `startSetup` and `finishSetup`, and never deletes anything before the new passkey verifies.
- The owner can never end up with zero passkeys through the app: setup deletes the old ones in the same transaction that inserts the new one, and any future remove action must refuse the last one.
- Auth event rows never hold an IP address, a token, or a challenge.

### Security model

One owner, one workspace, no other roles. Signed out, only `/studio/login`, `/studio/setup` (and only while `STUDIO_SETUP_TOKEN` is set), and their actions run; all of them sit behind the `STUDIO_ENABLED` flag. Signed in, everything in the studio is open to the owner, scoped to the session's workspace. Defense in depth, in order: the proxy (flag 404, then cookie presence redirect, never trusted alone), the `(signed-in)` layout guard, the guard inside every page and action (the real gate, because server actions can be POSTed to any path), and the workspace filter in the data layer.

Passkeys resist phishing by design: the browser only releases a signature for `STUDIO_RP_ID`. User verification is `preferred` at your choice, so a security key without a PIN, or an unlocked device whose platform skips the biometric step, can still sign in (see rationale.md for the tradeoff). Contact data in the studio is personal data under the Philippine Data Privacy Act, so the session layer is the access control for it; auth events keep no IP address to avoid adding more personal data. Preview deploys keep `STUDIO_ENABLED` off, so the studio is unreachable there.

### Failure and edge cases

- **Database down or slow**: `getStudioSession()` throws, the studio error page shows, nothing renders as signed in (fail closed). Login actions return `VERIFICATION_FAILED` style errors without creating a session.
- **Passkey from another environment** (localhost passkey used on production): the credential id is not in this database, so `UNKNOWN_PASSKEY`. Each environment needs its own passkey registered through setup.
- **Stale cookie** (session deleted or expired): the proxy sees a cookie and passes; the guard finds nothing and redirects to login with `next`; login sets a new cookie over it. No loop, because login pages never call `requireStudioAccess()`.
- **Two tabs signing in at once**: the challenge cookie holds only the newest challenge id, so the older tab's finish fails with `CHALLENGE_EXPIRED` and you retry there; any sessions that did get created are valid rows. Harmless.
- **Challenge cookie missing or expired** (prompt left open over 5 minutes): `CHALLENGE_EXPIRED`, message "Sign in failed. Try again.".
- **Counter goes backwards** on a single device credential: SimpleWebAuthn rejects it, reported as `VERIFICATION_FAILED` (possible cloned key). Synced passkeys report 0 and pass.
- **Setup token changed in Vercel**: env vars bind at deploy, so setting or removing `STUDIO_SETUP_TOKEN` needs a redeploy to take effect.
- **Unsupported browser**: the login page checks `browserSupportsWebAuthn()` and shows the AC-6 message with the button disabled.
- **Junk failure events**: anyone can trigger `sign_in_failed` rows by posting bad responses; accepted. They are small and the 90 day purge bounds them; a Vercel Firewall rule is the fix if it ever matters.
- **Loading state**: the button shows "Waiting for your passkey…" and is disabled while the prompt is open.

### UX surface

- **Design source**: the vital-stats admin login card (`C:\Projects\vital-stats\src\app\admin\login\page.tsx`), plus the screenshot you will share later. If the screenshot arrives before `/develop`, it wins on any detail where it differs from the code.
- **Keep from vital-stats**: the centered card with rounded corners and a soft shadow on a solid deep background, the two chips at the top ("Secure" filled, "Studio Access" outlined), a logo or name line, a short uppercase headline, and the folded corner "Back to website" control that links to `/`.
- **Change**: no keypad and no code slots. The headline reads "Sign in", with one full width button "Sign in with passkey" and a one line message area under it for AC-6 states. The setup screen uses the same card with headline "Set up a passkey", one token field (type `password`, `autocomplete="off"`), and a "Continue" button that starts registration.
- **Theme**: use this site's `stone` palette and `archivo` font through Tailwind classes (`dark:` variants for dark theme), not the vital-stats teal variables and inline styles.
- **Security page**: inside the signed in shell, one line "You have N passkeys", the "Add another passkey" button, and a status line for success or the AC-9 refusal.
- **Accessibility**: real `<button>` elements, visible focus rings, the message area as `role="status"` with `aria-live="polite"`.

### Configuration required

- `STUDIO_RP_ID`: the passkey domain. `localhost` in Development; your production host (apex or `www`, exactly the one the studio is served from) in Production. Not set in Preview.
- `STUDIO_ORIGIN`: the full origin, `http://localhost:3000` in Development, `https://<production host>` in Production. Must match the browser's origin exactly.
- `STUDIO_SETUP_TOKEN`: at least 32 characters (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`). Set only while enrolling or recovering, then removed. Never committed.
- `STUDIO_ENABLED`: now also `"true"` in Production once this feature ships. Stays unset in Preview.
- No new packages besides `@simplewebauthn/server` and `@simplewebauthn/browser` (same major for both, current at install time; v13 as of this writing).

### Critical test scenarios

- Happy path: with the setup token set, register a passkey on localhost, sign out, sign in with it, land on the `next` page, see the shell counts for the session's workspace, verifies **AC-4**, **AC-5**, **AC-11**
- Failure case: two parallel `finishSignIn` calls with the same challenge cookie, only one creates a session, verifies **AC-5**, **AC-6**
- Failure case: a wrong setup token 5 times, then the right token is refused until the 15 minute window passes, verifies **AC-4**
- Auth/permission: signed out, GET `/studio` and `/studio/security`, and POST a captured server action ID for `signOutEverywhere` and a data action, once with no cookie (the proxy redirects) and once with a stale cookie value (the proxy passes it, so the guard inside the action must reject it); each redirects to login and changes nothing, verifies **AC-1**, **AC-2**
- Recovery: with two passkeys registered, run setup again; afterwards only the new passkey signs in and every old session is gone. Run setup with a wrong origin response; nothing is deleted, verifies **AC-4**
- Auth/permission: `STUDIO_ENABLED` off, `/studio/login` and `/studio/setup` return 404, verifies **AC-3**
- Session: set `last_seen_at` back 25 hours, load a page, `expires_at` moves; set `expires_at` in the past, you are signed out, verifies **AC-7**
- Open redirect: `/studio/login?next=//evil.example` and `next=https://evil.example` both land on `/studio`, verifies **AC-5**

## Build plan

Tracer Bullet: first one thin thread through every layer (table, passkey, session, guard, page) on localhost, then thicken it.

1. [x] Add `@simplewebauthn/server` and `@simplewebauthn/browser`. Add the five tables to `src/studio/db/schema.ts`, generate one migration (`0005_studio_login`), and append the insert of the owner row and its `workspace_members` row with `STUDIO_OWNER_ID`. Export `STUDIO_OWNER_ID` from `src/studio/auth/config.ts`, satisfies **AC-4**, **AC-11**
2. [x] Restructure the routes: root layout calls a new `requireStudioEnabled()`; move the shell into `(signed-in)` with its own guarded layout; add empty `(auth)/login` and `(auth)/setup` pages, satisfies **AC-1**, **AC-3**
3. [x] Thin thread: `config.ts` (env reads), `session.ts` (create, hash, look up with `cache()`, cookie set and clear), `requireStudioAccess()` returning `StudioSession` and redirecting to `/studio/login`, `startSetup`/`finishSetup` with the token check, `startSignIn`/`finishSignIn`, and bare login and setup pages wired to `@simplewebauthn/browser`. Prove: register on localhost, sign in, see the shell, satisfies **AC-1**, **AC-4**, **AC-5**
4. [x] `getWorkspaceId()` from the session plus `runInWorkspace()`; wrap the seed script body in `runInWorkspace(STUDIO_WORKSPACE_ID, …)` and confirm `npm run db:seed` still runs, satisfies **AC-11**
5. [x] Proxy: keep the flag 404; for paths other than login and setup, redirect to `/studio/login?next=` when the cookie is absent; set `x-studio-pathname`; refresh the cookie `Max-Age`. Guard reads `x-studio-pathname` for `next`; add `safeNext()`, satisfies **AC-1**, **AC-5**, **AC-7**
6. [x] Sliding expiry in `getStudioSession()`, cleanup of expired sessions and old events on sign in, satisfies **AC-7**, **AC-10**
7. [x] `signOut` and `signOutEverywhere` plus the studio header; make `finishSetup` the full recovery transaction (delete passkeys and sessions, insert passkey, create session, only after verification), satisfies **AC-4**, **AC-8**
8. [x] `events.ts` and `deviceLabel()`; write every event kind; the setup throttle with its check order, satisfies **AC-4**, **AC-6**, **AC-10**
9. [x] Login page states and messages, already signed in redirect, and the vital-stats card styling in light and dark theme; setup page styling, satisfies **AC-6**, **AC-12**, **AC-14**
10. [x] `/studio/security` with the passkey count and `startAddPasskey`/`finishAddPasskey`, satisfies **AC-9**
11. [x] Config and checks: `.env.example` entries; extend `scripts/check-studio-leak.mjs` with `STUDIO_SETUP_TOKEN` as an optional needle; fail the build on Vercel Production when `STUDIO_ENABLED` is `"true"` and `STUDIO_RP_ID` or `STUDIO_ORIGIN` is missing; update the comments in `guard.ts`, `proxy.ts`, and `workspace.ts`, satisfies **AC-13**
12. [ ] Production enablement (you, in Vercel): set `STUDIO_RP_ID`, `STUDIO_ORIGIN`, `STUDIO_ENABLED=true`, and a temporary `STUDIO_SETUP_TOKEN` in Production; deploy; register your passkey at `/studio/setup`; remove the token; redeploy, satisfies **AC-4**, **AC-13**

## Consequences

**Positive**:
- Nothing to guess or phish: no password, no code, no reset email. The weak spot in vital-stats (a short passcode with no rate limit) does not exist here.
- Sessions are rows, so "sign out everywhere" and recovery are row deletes that take effect on the next request.
- No new hosted service, no new public API route, and no long lived auth secret in the environment (the setup token lives only while you enroll).
- The workspace now comes from the session, which closes the spec 0004 follow up and makes the data layer ready for more workspaces.

**Negative / tradeoffs**:
- You own the session code (cookie, hashing, sliding, cleanup). It is small, but bugs in it are security bugs; the critical scenarios above must become tests.
- Every guarded request reads one session row, and once a day per session it also writes one. Fine for one owner; a busier product would want a short cache.
- A passkey only works on the domain it was created for: localhost and production each need their own, and moving to a new domain (the parked ED Solutions rebrand) means enrolling again through setup.
- Losing every device means a Vercel env change plus two redeploys to recover, and recovery always replaces every passkey, so you add your other devices again afterwards from `/studio/security`.
- `preferred` user verification accepts a sign in without a biometric or PIN on authenticators that skip it.
- Preview deploys cannot exercise the studio; studio changes are verified locally and in production only.

**Neutral**:
- The shell page moves into a `(signed-in)` route group; URLs do not change.
- The seed script now wraps its work in `runInWorkspace()`.
- `requireStudioAccess()` now returns the session; existing callers that ignore the value keep working.

## Follow-up

- [ ] Agent Skill and MCP search for SimpleWebAuthn ran in the background during the design; record its outcome (installed skills in `AGENTS.md`, or the decline).
- [ ] `src/studio/AGENTS.md` should gain the auth conventions once built (`src/studio/auth/`, the two guard functions, `runInWorkspace`, the env vars). `/sync` owns that.
- [ ] Spec 0003: Preview no longer gets `STUDIO_ENABLED` when login ships (0003 planned to turn it on there behind Deployment Protection). `/sync` should flag 0003's config note as stale.
- [ ] Later, if you want them: rename and remove passkeys (never the last), an active sessions list, and a recent activity view over `auth_events`. All fit the tables above without a migration.
- [ ] If the ED Solutions rebrand moves the domain, plan a passkey re-enrollment through setup.
