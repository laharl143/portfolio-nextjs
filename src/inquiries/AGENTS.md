# Lead intake (public submissions into the studio)

Governing spec: [0010 lead intake](../../docs/specs/0010-lead-intake/index.md). This is the one public write path into the studio database. Everything else in the studio stays owner only.

## Where things live

- `public-config.ts`: `getPublicIntakeConfig()`, the only module public pages import from here (the flag and the Turnstile site key). It never imports the database or the studio.
- `config.ts`: `getIntakeConfig()` and `getAlertConfig()`. Every missing or invalid value becomes `UNAVAILABLE` (503). Production refuses Cloudflare test secrets. Outside production, alerts only go to `delivered@resend.dev`.
- `rules.ts`: `IntakeError` (code, HTTP status, `fieldErrors`), `parseSubmission()`, `STATUSES` (`new`, `reviewing`, `converted`, `closed`), `transitionAllowed()`, and the payload and conversion hashes.
- `ingest.ts`: `ingest()` and `verifyChallenge()`. It checks the exact `Origin`, then JSON only (415), a 64 KB body limit (413), Turnstile, HMAC keyed rate windows (10 per address, 3 per email), and duplicate keys (a changed payload is `KEY_CONFLICT`, 409).
- `alerts.ts`: `attemptAlert()` sends the owner email through the Resend REST API, keyed by `Idempotency-Key` `lead-inquiry/<alert>/<generation>`. Alert states are `pending`, `sending` (a 30 second lease), `accepted`, `failed`, and `unknown`.
- `cleanup.ts`: `authorizeCleanup()` and `cleanupInquiries()`, the daily retention job (12 months, batched, skips when another run holds the workspace lock).
- `db.ts`: `rows()`, `workspaceLock()` (a per workspace advisory lock), `validateWorkspace()`, over the studio Drizzle client.
- Routes: `src/app/api/inquiries/route.ts` (public `POST`), `src/app/api/internal/inquiries/cleanup/route.ts` (cron `GET`, scheduled in `vercel.json` at 03:00 UTC). The form is `src/components/ContactForm.tsx`, and its page is `src/app/(site)/contact/page.tsx`. The owner side lives in the studio (see [src/studio/AGENTS.md](../studio/AGENTS.md)).

## Rules

- Every module here except `public-config.ts` starts with `import "server-only"`. Public pages never import anything else from this folder.
- Responses never echo submitted values and are always `Cache-Control: no-store`. Errors log only a code, never personal data.
- Outside production, the Turnstile check accepts Cloudflare's test key reply (no `action`, hostname `example.com`) only with the test secret and a successful reply. Production always requires `action === "lead_intake"` and the configured hostname, and it rejects test key replies.
- Writes that touch an inquiry's alert or retention take `workspaceLock()` first, so cleanup never deletes an inquiry while an alert is `sending`.
- A provider `5xx` or a network error records `unknown`, not `failed`: the email may still have arrived. A retry within the 1 minute cooldown is `RETRY_COOLDOWN` (429), and an alert already `accepted` is never sent again.
- Cleanup answers only in production, with `Authorization: Bearer $CRON_SECRET` (at least 32 bytes, compared in constant time). Locally it always returns 401.
- Intake is off unless `LEAD_INTAKE_ENABLED=true`, and never on in Preview. When it is enabled in production, the leak check fails the build unless every intake variable is set (names in `.env.example`). Intake secrets are scanned in the build output.
- Fixtures and test data stay fake (`test:db` and `test:e2e` create and remove their own rows on the Neon dev branch).

_Drafted by /sync from the introducing change, worth a quick human pass._
