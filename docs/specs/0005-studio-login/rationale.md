# 0005. Studio login: rationale

## Context

> ⚠️ Premise note: this design writes its own session layer, which is the "reinventing auth" pattern that usually ends badly. It is accepted here on purpose, and the risk is kept small. SimpleWebAuthn does all the WebAuthn cryptography, so the code you own is only an opaque random token, its hash in a table, a cookie, and a guard. There are no JWTs, no refresh tokens, no password storage, and no reset flow, which are the parts that usually go wrong. The price is that the critical test scenarios in `index.md` are not optional: they are the evidence that the session layer is correct.

> ⚠️ Premise note: you asked to do this "how I did it with vital-stats". The vital-stats admin uses a six character passcode on a keypad (digits plus five symbols, about 11 million combinations), checked with bcrypt by the `next-auth` v4 Credentials provider, with 24 hour JWT sessions and no rate limit or lockout. That is a passcode, not a passkey. On review you chose a real passkey and kept only the vital-stats card look. Separately, vital-stats would benefit from a rate limit on its passcode check; that is outside this repo.

The studio (spec 0003) is a gated `/studio` area in the same Next 16 app and Vercel deploy as the public site. Today a `STUDIO_ENABLED` flag keeps it a 404 everywhere except your machine, because there is no login. The data model (spec 0004) holds client contacts, which are personal data under the Philippine Data Privacy Act, plus contract terms and private system notes. Until a real login exists, none of that can run in production.

There is exactly one user, you, on a handful of your own devices. There is no signup, no second role, and no customer facing auth. Spec 0003 fixed the contract: `requireStudioAccess()` in `src/studio/guard.ts` is the one place the login plugs in, called by every layout, page, and server action, with the proxy as a first filter only. Spec 0004 added a `workspace_id` to every record and left `getWorkspaceId()` returning a constant until the session can supply it.

The forces: the strongest practical protection for data that matters, the fewest new services and secrets (the database URL and Blob token already sit in the same Vercel project as the public site), something you can operate alone without a support path, and a shape that does not block the studio from growing into multi user CRM and Invoicing products. Not deciding keeps the studio a local only tool.

## Options considered

### Option 1: Passkeys through SimpleWebAuthn, sessions you own

`@simplewebauthn/server` and `@simplewebauthn/browser` handle the WebAuthn ceremonies; the studio stores credentials, challenges, opaque hashed session tokens, and auth events in five small tables in the `studio` schema; server actions drive the flow; `requireStudioAccess()` reads the session. A one time setup token enrolls the first passkey and doubles as recovery.

**Pros**:
- Phishing resistant, nothing to guess, nothing secret stored on the server.
- No hosted service, no public catch all auth route, no long lived auth secret.
- Fits the existing guard contract and schema conventions exactly; sessions are revocable rows.

**Cons**:
- You own the session code, and its bugs are security bugs.
- Passkeys are bound to one domain, so every environment needs its own enrollment, and Preview cannot run the studio.
- Recovery needs a Vercel env change and redeploys.

### Option 2: Better Auth with its passkey plugin and Drizzle adapter

A full auth framework (which Auth.js has also moved under) with sessions, revoke all, rate limiting, and a Drizzle adapter, plus a passkey plugin built on SimpleWebAuthn.

**Pros**:
- Session handling, cookie rules, and rate limiting written and reviewed by others.
- A clear path to more users and sign in methods for the CRM and Invoicing products.

**Cons**:
- Built around user signup; a passkey only, single owner setup with no email needs workarounds for the first enrollment.
- Adds its own `user`, `account`, `verification` tables and a public `/api/auth/*` handler to guard and keep current.
- More surface than one owner needs today.

### Option 3: Auth.js v5 with its WebAuthn provider

Closest to what vital-stats runs (`next-auth`), with a passkey provider.

**Pros**:
- Familiar from vital-stats; adapters exist for Drizzle.

**Cons**:
- The WebAuthn provider is still marked experimental, and new development has moved to Better Auth.
- Same public route and table overhead as Option 2, with less momentum behind it.

### Option 4: Passcode keypad like vital-stats, hardened

Reuse the vital-stats flow with a longer code, bcrypt, a rate limit, a lockout, and database sessions.

**Pros**:
- Familiar, works on any device, no domain binding.

**Cons**:
- Still a shared secret someone can phish, shoulder surf, or guess with enough attempts; you must build the rate limit and lockout yourself.
- Weaker protection for personal data than a passkey for about the same build effort.

## Rationale

The studio's real risk is someone else reading your clients' contact data and contract terms from a public deploy that shares a Vercel project with the marketing site. A passkey removes the guessable and phishable secret entirely, which a passcode (Option 4) cannot do however well it is rate limited. Among the passkey options, the deciding force is the single owner shape: Better Auth (Option 2) is the right answer for a product with signups, but here it brings a signup oriented model, extra tables, and a public auth route to protect, all to serve one person. Auth.js (Option 3) adds the same overhead on an experimental provider.

Option 1 keeps every moving part inside the contract spec 0003 already set: one guard, the `studio` schema, server only modules, and no new public endpoint. The usual danger of owning auth is concentrated in token formats, refresh, and password reset; none of those exist here. The session is a random token whose hash is a primary lookup key, which is about as simple as revocable sessions get. When the studio becomes a multi user product, Option 2 is the natural migration, and the `owners` plus `workspace_members` shape maps onto it without reshaping the business tables.

You chose `preferred` user verification over the recommended `required`. That is a workable choice: platform passkeys on phones and laptops almost always verify anyway. The cost you are accepting is that an authenticator which skips verification (a security key without a PIN, or a platform that only checks presence) signs in on possession alone. If you later want the stronger rule, it is one option in two places (`userVerification` in both option generators, `requireUserVerification` in verification), with no migration.

Keeping the studio off in Preview follows from the domain binding: random `*.vercel.app` hosts cannot hold a stable passkey, and a fixed preview domain is more setup than one owner needs. Studio changes are proven on localhost (its own passkey) and in production.
