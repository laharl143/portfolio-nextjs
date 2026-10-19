# Verify: Studio login · spec 0005 · updated 2026-10-19
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Run locally with `STUDIO_ENABLED=true`, `STUDIO_RP_ID=localhost`, `STUDIO_ORIGIN=http://localhost:3000`, against the Neon dev branch. Use a browser profile with a platform passkey (Windows Hello, Touch ID) or a virtual authenticator (Chrome DevTools, WebAuthn panel).

## UI / manual
- [ ] Without `STUDIO_SETUP_TOKEN`, open `/studio/setup` → 404 → AC-4
- [ ] Set a 43 character `STUDIO_SETUP_TOKEN`, restart, open `/studio/setup`, enter a wrong token → "That token is not valid", no passkey row → AC-4
- [ ] Enter the right token, complete the prompt → lands on `/studio/security`, "You have 1 passkey" → AC-4
- [ ] Sign out → `/studio/login`; open `/studio` → redirected to `/studio/login?next=%2Fstudio` → AC-1, AC-8
- [ ] On `/studio/login?next=/studio/security`, sign in → lands on `/studio/security` → AC-5
- [ ] Open `/studio/login` while signed in → redirected to `/studio` → AC-12
- [ ] Cancel the passkey prompt → "Sign in was cancelled. Try again.", no session row, no event → AC-6
- [ ] In the virtual authenticator, create a passkey for `localhost` that is not in the database and sign in with it → "This passkey is not registered for this studio." and a `sign_in_failed` event → AC-6
- [ ] On `/studio/security`, add a second passkey (a second virtual authenticator) → count 2; sign out and sign in with the new one → works → AC-9
- [ ] Try "Add another passkey" again on the same authenticator → "This device already has a studio passkey." → AC-9
- [ ] Sign in on two browsers, press "Sign out everywhere" in one → the other is redirected to login on its next click → AC-8
- [ ] Login and setup screens in light and dark theme match the vital-stats card layout (chips, headline, single button, back corner); tab through them, focus is visible → AC-14
- [ ] View source on `/studio/login` → `noindex, nofollow` → AC-14

## Commands
- [ ] Run `next build && next start` over `http://localhost:3000` with `STUDIO_ORIGIN=http://localhost:3000`, sign in from Firefox → works (cookie is `studio_session`, not `__Host-`) → AC-5
- [ ] `npm run db:migrate` on a fresh branch → `owners`, `workspace_members`, `passkeys`, `sessions`, `auth_challenges`, `auth_events` exist in schema `studio`; one owner row `…0002`; one membership row → AC-4, AC-11
- [ ] `select token_hash from studio.sessions` → 64 hex characters, and it differs from the cookie value in DevTools → AC-5
- [ ] `update studio.sessions set last_seen_at = now() - interval '25 hours'`, load `/studio` → `last_seen_at` is now, `expires_at` about 30 days out; load again → no change → AC-7
- [ ] `update studio.sessions set expires_at = now() - interval '1 minute'`, load `/studio` → redirected to login → AC-1, AC-7
- [ ] Enter a wrong setup token 5 times, then the right one → refused; `update studio.auth_events set created_at = created_at - interval '16 minutes' where kind = 'setup_rejected'`, retry → works; every earlier session row and every earlier passkey row is gone, only the new passkey signs in → AC-4
- [ ] `/studio/login?next=` with each of `//evil.example`, `https://evil.example`, `/studiofoo`, `/studio/../x`, `/%09/evil.example`, `/studio/login`, sign in → lands on `/studio` every time → AC-5
- [ ] Signed out, replay a captured server action POST (DevTools, copy as fetch) for `signOutEverywhere`, once with no cookie and once with a stale `studio_session` value → redirect both times, session rows unchanged → AC-2
- [ ] Insert an `auth_events` row dated 91 days ago, sign in → it is gone → AC-10
- [ ] `select * from studio.auth_events order by created_at` → one row per action above, no IP, browser labels like "Chrome on Windows" → AC-10
- [ ] `npm run db:seed` with no browser session → runs and reports counts as before → AC-11
- [ ] With `STUDIO_ENABLED` unset, `/studio/login` and `/studio/setup` → 404 → AC-3
- [ ] `VERCEL=1 VERCEL_ENV=production STUDIO_ENABLED=true npm run build` with `STUDIO_RP_ID` unset → build fails with a clear message → AC-13
- [ ] Set `STUDIO_SETUP_TOKEN`, build, and confirm the leak check lists it as a needle; `git grep` the token value → nothing → AC-13
- [ ] `.env.example` lists `STUDIO_RP_ID`, `STUDIO_ORIGIN`, `STUDIO_SETUP_TOKEN` with empty values → AC-13

## Added by /develop · 2026-10-19
_How it was driven: Playwright with a Chrome virtual authenticator over CDP (`WebAuthn.enable`, then `WebAuthn.addVirtualAuthenticator` with `protocol: "ctap2"`, `transport: "internal"`, `hasResidentKey`, `hasUserVerification`, `isUserVerified`, `automaticPresenceSimulation` all true). Chrome allows one `internal` authenticator per browser; use `transport: "usb"` for a second device. A local test setup token goes in `.env.development.local` and comes out again afterwards. Bypass any corporate HTTP proxy for localhost (`curl --noproxy '*'`)._

- [ ] Open the login page in two tabs, start sign in in both, finish the older one last → the older tab shows "Sign in failed. Try again." (its challenge cookie was replaced), the other signs in, no error in the console → AC-6 (Value sourcing: challenge id cookie)
- [ ] With two passkeys on two authenticators, run setup (recovery) on one; then sign in with the other authenticator's old passkey → "This passkey is not registered for this studio." and a `sign_in_failed` event → AC-4, AC-6
- [ ] Signed in, load any studio page (GET) → the response sets the session cookie again with a fresh 30 day `Max-Age`; press "Sign out" (a POST) → the response only clears the cookie, the proxy does not set it again → AC-7, AC-8
- [ ] Signed in, `/studio` shows the record counts for the session's workspace (Clients 3 and so on on the seeded dev branch) → AC-11 (Value sourcing: `getWorkspaceId()`)
- [ ] `/studio/login?next=/studio/security?tab=1`, sign in → lands on `/studio/security?tab=1` (a safe value is kept with its search string) → AC-5
