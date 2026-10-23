# Lead intake production launch

Prepared 2026-10-22 for scope feature 27, Jira DP-82 and DP-83, and accepted spec 0010. Closed by owner decision on 2026-10-23. The setup checklist below is retained for future launches; current evidence and skipped checks follow here.

## Launch completion record, 2026-10-23

The owner registered and verified `ed-solutions.dev`, approved sender `alerts@ed-solutions.dev` and recipient `erskine.duenas@gmail.com`, configured production Turnstile and deployment settings, and enabled intake. Owner screenshots prove successful form confirmation, private studio storage, alert acceptance and actual Gmail receipt. The Midnight blue email template deployment `cf07a5b` is Ready in Production.

Live unauthenticated checks returned login redirects for list/detail/conversion, cleanup 401, wrong origin and invalid challenge 403, and public GET API 405. Vercel recorded `vercel-cron/1.0` calling production cleanup at 11:39 AM Manila with HTTP 200. Neon recorded outcome `complete`, last success `2026-10-23 03:39:53.440181+00`, zero inquiry and rate window deletions, and no error. The existing unit and DOM suite passed 97 tests in 17 files.

The owner accepted completion without live Preview denial or authenticated provider failure/retry checks and skipped the separate Beta test stage. The verification run remains partial, not PASS. No additional production inquiry, email or authenticated cleanup was triggered by the agent's verification. Keep the disable procedure below available for operations.

## Owner inputs

Record approvals in your private launch record, without credentials or visitor details in this repo.

You are the account contact. The table below captures the initial preparation state on 2026-10-22; the launch completion record above supersedes its pending statuses.

| Input | Required confirmation | Current evidence |
|---|---|---|
| Sending domain and mailbox | You own the domain or have permission to send through it; DNS administrator can install Resend verification records | Not supplied |
| Owner recipient | Exact mailbox you approve and can check for receipt | Not supplied |
| Resend | Account administrator, verified domain, sending credential and available sending capacity | Not verified |
| Cloudflare | Account administrator and real Turnstile widget restricted to `ed-solutions.dev` | Not verified |
| Vercel | Production project `portfolio-nextjs`, team access, environment and deployment authority | Local `.vercel/project.json` identifies the project only; account access not verified |
| Neon and workspace | Production branch, pooled and direct URLs, existing workspace UUID and owner membership | Not verified |
| Studio | Production passkey sign in works and owner can open the inquiry inbox | Not verified |

The website origin is `https://ed-solutions.dev`, from `src/lib/site.ts`. The owned domain `ed-solutions.dev` (Cloudflare Registrar, bought 2026-10-22) can be verified in Resend as the sending domain. Do not infer sender ownership or recipient approval from public contact links. If no owned sender is available, leave intake disabled and request an approved sending setup. No purchase or DNS change is implied by this checklist.

## Production setup to review

Use the production environment only. Enter secrets directly in the provider or deployment secret settings, never in chat or this file. Confirm the production database target before any deployment, because `scripts/migrate-on-build.mjs` applies all pending migrations under a lock. Review all unapplied migration files, including changes outside intake. Local builds do not apply them.

| Variable | Source and check |
|---|---|
| `LEAD_INTAKE_ENABLED` | Start with `false`; change to `true` only for the approved launch deployment |
| `LEAD_INTAKE_WORKSPACE_ID` | Existing production workspace UUID, with the correct owner membership |
| `LEAD_INTAKE_ORIGIN` | Exactly `https://ed-solutions.dev`, no trailing slash |
| `TURNSTILE_SITE_KEY` | Real production widget for hostname `ed-solutions.dev` |
| `TURNSTILE_SECRET_KEY` | Matching production secret, never Cloudflare test keys |
| `RESEND_API_KEY` | Production sending credential for the approved verified domain |
| `INQUIRY_ALERT_FROM` | Approved sender mailbox on the verified owned domain |
| `INQUIRY_ALERT_TO` | Approved owner recipient, checked by the owner |
| `INQUIRY_RATE_SECRET` | Independently generated secret with at least 32 random bytes |
| `CRON_SECRET` | Separate independently generated secret with at least 32 random bytes |
| `DATABASE_URL` | Pooled production Neon connection |
| `DATABASE_URL_UNPOOLED` | Direct connection to the same production branch for migrations |

Retain existing studio configuration, including `STUDIO_ENABLED=true`, correct `STUDIO_RP_ID` and `STUDIO_ORIGIN`, and the private Blob configuration. Remove any temporary `STUDIO_SETUP_TOKEN` after passkey enrollment and redeploy. Preview must not use production credentials or accept inquiries. Retain the preview production database host guard, and verify the preview database is a separate branch.

Resend domain verification and DNS access, Turnstile widget creation, deployment configuration, production migrations, enabling intake, and the controlled email send are external steps to approve after reviewing this setup. Provider dashboards are not connected in this session. Local project metadata does not prove deployment configuration.

## Launch sequence and acceptance record

Use a private record for deployment ids, timestamps, mailbox receipt and provider evidence. Keep personal details, keys, connection strings and raw responses out of committed evidence.

1. With intake disabled, configure the approved accounts and production values. Review the pending migrations and deploy the approved revision. Confirm successful migration and leak check output. A passing build with intake disabled does not validate all intake configuration. (AC-11, AC-12)
2. Sign in with the production owner passkey and open `/studio/inquiries`. Confirm the workspace is correct. In a signed out session, the inbox and a known detail URL must deny access without returning inquiry content. (AC-5, AC-10)
3. Confirm disabled `/contact` shows its fallback and a POST to `/api/inquiries` returns 503. Confirm Preview remains unavailable even if its enable flag is set. Do not bypass protection or point Preview at production to test this. (AC-11)
4. Review and approve the change to `LEAD_INTAKE_ENABLED=true`, deployment and single controlled inquiry to the approved owner mailbox. Use the real form with owner controlled, clearly synthetic content and a unique label. The production challenge must succeed with action `lead_intake` and the exact hostname. (AC-2, AC-3, AC-11)
5. Confirm the visitor sees only “Thanks, your inquiry has been received.” Confirm one New inquiry in the private inbox and the expected saved fields. Confirm alert acceptance in the studio, then actual receipt in the approved mailbox, including spam folders. The email must contain only generic text and a private link; the link must require owner access. A provider acceptance alone is insufficient. (AC-4, AC-5, AC-8, AC-10)
6. Confirm the deployed cron path `/api/internal/inquiries/cleanup` appears with schedule `0 3 * * *` UTC (11:00 AM Asia/Manila). An unauthenticated request must return 401. Observe the next scheduled run and the inbox maintenance health. An authorized manual invocation is a real deletion operation, so review eligible production data and obtain approval before using it. Complete success updates `last_success_at`; `overlap`, `incomplete` and `failed` do not prove completion. (AC-9, AC-10)
7. Exercise provider failure, duplicate submission, conversion races, wrong workspace, retention boundaries and challenge rejection using the existing fake development suites. Do not invalidate production credentials or age real inquiries to simulate failure. No visitor resubmission should be requested because an alert fails. (AC-3, AC-4, AC-6 through AC-12)
8. Record the deployment, controlled confirmation, private storage, mailbox receipt, access denial, Preview denial, cleanup result and rollback readiness. Leave launch incomplete if any evidence is missing. Run the scope's Beta verification and test stages before marking the feature done.

The data source checks include configured workspace rather than visitor input, exact production origin, normalized submitted email, database timestamps displayed in the studio time zone, configured sender and recipient, stored alert attempts, and database time for retention. Existing spec `verify.md` covers the full value sourcing table and local acceptance criteria; this runbook adds production evidence only.

## Disable and recovery

If checks fail, set production `LEAD_INTAKE_ENABLED=false` and deploy. Confirm the new deployment is serving traffic, `/contact` uses the fallback, and a POST returns 503. This stops new intake after the deployment takes effect; an already executing request may finish. Keep saved inquiries for private review. Do not roll back schema migrations or delete records as a launch rollback.

Keep database, workspace and cron configuration so retention continues independently of intake and studio flags. Disabling intake does not disable manual owner alert retries. Inspect failed or unknown attempts before retrying: accepted alerts cannot be resent, uncertain sends may already have arrived, and the studio confirmation and cooldown protect retries. Do not change alert attempt rows manually.

## Local checks and resume point

Suggested local commands are `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build`. Integration commands are `npm run test:db` and `npm run test:e2e`, using fake data on the development branch only. A local pass cannot establish production account ownership, mailbox delivery, production migration state or scheduled execution.

For future changes, review the configuration and disable procedure. Initial preparation alone made no production changes; the owner subsequently completed setup and supplied the production evidence recorded above.

Preparation checks on 2026-10-22: 31 tests passed across `src/inquiries/config.test.ts`, `src/inquiries/ingest.test.ts` and `src/inquiries/alerts.test.ts`. `git diff --check` passed. These are focused local checks, not production launch evidence. Application code was unchanged; full build, database and browser suites were not rerun for the documentation changes.

Provider references: [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction), [Turnstile widget management](https://developers.cloudflare.com/turnstile/get-started/widget-management/), [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
