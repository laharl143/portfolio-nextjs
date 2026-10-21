# Scope: Erskine Duenas, Portfolio Site

A personal portfolio site (Next.js) used to job hunt for a mid to senior software engineer or architect track role. This pass repositions the content and adds the cross cutting groundwork (SEO, light performance and accessibility hygiene, engagement tracking) a job hunting site needs.

The site is now growing past the portfolio. The public site stays as it is, gains a public Products page for your SMB SaaS ecosystem, and gets a private studio behind a login where you run your freelance business (clients, contracts, and the full systems map). The studio is an early version of your planned CRM and Invoicing products, with you as customer zero. A full rebrand to ED Solutions is parked in Deferred.

**Build approach:** Tracer Bullet (each feature is built complete and working end to end before moving to the next; no throwaway shell, no MVP left half grown).
**Workflow:** Alpha (`/check verify` after `/develop`; no formal test suite or second model review by default). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Hero & intro | Existing | existing |
| 2 | Header & navigation | Existing | existing |
| 3 | Certifications & Badges | Existing | existing |
| 4 | Skills marquee | Existing | existing |
| 5 | Projects showcase | Existing | existing |
| 6 | Testimonials | Existing | existing |
| 7 | FAQs | Existing | existing |
| 8 | Footer & contact | Existing | existing |
| 9 | Theme toggle | Existing | existing |
| 10 | CV download | Existing | existing |
| 11 | Analytics (page views) | Existing | existing |
| 12 | Projects restructuring & case study | Next slice | done |
| 13 | Certifications curation | Next slice | done |
| 14 | Hero repositioning copy | Next slice | done |
| 15 | SEO foundation | Next slice | done |
| 16 | Skills marquee cleanup | Next slice | done |
| 17 | On-site engagement tracking | Next slice | done |
| 18 | Public Products page | Products | done |
| 19 | Studio placement & stack | Studio foundation | done |
| 20 | Studio data model | Studio foundation | done |
| 21 | Studio login | Studio foundation | done |
| 22 | Client tracking | Studio slice 1 | done |
| 23 | Contracts & PDF export | Studio slice 2 | done |
| 24 | Private systems map | Studio slice 3 | done |
| 25 | Lead intake form | Studio slice 4 | in-progress |

## Existing

### 1. Hero & intro · existing
Landing hero with name, role tagline, mission statement, CV download, and social links. code in `src/sections/Hero.tsx`, `src/sections/Intro.tsx`

### 2. Header & navigation · existing
Sticky nav across About, Certifications, Skills, Projects, FAQs, Contact. code in `src/sections/Header.tsx`

### 3. Certifications & Badges · existing
Certification wall pulling from Credly, 21 badges synced to `badges-data.js`, plus 2 Oracle Cloud certifications added manually (not on Credly's public feed). Curated into a featured/show all view by feature 13. code in `src/sections/Badges.tsx`, `utils/data/badges-data.js`

### 4. Skills marquee · existing
Scrolling marquee of core skills (Java, Spring Boot, React, etc). code in `src/sections/Skills.jsx`

### 5. Projects showcase · existing
Flat list of projects (Vital Stats down to vanilla JS practice exercises), no tiering; currently undersells the CV's senior/architect level work. code in `src/sections/Projects.tsx`

### 6. Testimonials · existing
code in `src/sections/Testimonials.tsx`

### 7. FAQs · existing
code in `src/sections/FAQs.tsx`

### 8. Footer & contact · existing
code in `src/sections/Footer.tsx`

### 9. Theme toggle · existing
Dark and light mode via `next-themes`. code in `src/components/ThemeToggleButton.tsx`

### 10. CV download · existing
code in `public/erskine_duenas_cv.pdf` (linked from Hero)

### 11. Analytics (page views) · existing
`@vercel/analytics` wired in for baseline page view analytics. code in `package.json`

## Next slice

### 12. Projects restructuring & case study · done
Replace the flat project list with a tiered layout (flagship project, in progress work, and foundations/learning projects collapsed), so the site reflects the seniority your CV already shows. The planned agentic pipeline case study card was built, then removed on 2026-09-18 after the engineer saw it live and found it too self referential; see spec 0001's Amendment.
**Done when:** the Projects section renders 3 visually distinct tiers; vanilla JS exercises are collapsed out of the primary view; alt text and keyboard navigation work across all tiers.
- [x] Design it (spec): `/architect projects restructuring & case study`
- [x] Build it: `/develop projects restructuring & case study`
   - [x] Data shape + tier grouping (tier field, 3 grouped sections in order), satisfies AC-1, AC-2
   - [x] Foundations show all/show featured only toggle, satisfies AC-4
   - [x] ~~Case study card~~ built, then removed per engineer decision (spec 0001 Amendment, 2026-09-18)
   - [x] Polish: image fallback, Flagship visual weight, accessibility pass, satisfies AC-5, AC-6, AC-7
- [x] Verify it: `/check verify projects restructuring & case study` (PASS, 2026-09-18)
spec [0001](../specs/0001-projects-restructuring-case-study/index.md) · code in `src/sections/Projects.tsx`

### 13. Certifications curation · done
Finish the certification work already underway: rework the flat 23 badge grid into a featured row (3 to 4 top credentials) with the rest behind a "show all" toggle, as discussed.
**Done when:** the section shows a featured set by default with the full set behind one click; filter buttons still work against the full set.
- [x] Build it: `/develop certifications curation`
   - [x] Add the 2 Oracle certs (live: AI Foundations Associate + Foundations Associate, both issued May 24, 2026)
   - [x] Featured row (6 credentials: both Oracle certs, Introduction to Modern AI, Well-Architected Proficient, Claude Partner Badge, IBM Generative & Agentic AI Developer) plus "show all"/"show featured only" toggle for the rest
- [x] Verify it: `/check verify certifications curation` (PASS, 2026-09-18, all 6 behaviors confirmed in browser)
code in `src/sections/Badges.tsx`, `utils/data/badges-data.js`

### 14. Hero repositioning copy · done
Swap the generic "back-end focused, full-stack capable" subhead for language that plants the architect framing up top. No drafted copy was actually found in project history; the engineer picked from 3 options drawn from the CV and the header's existing "[Aspiring Software Architect]" rotating tagline.
**Done when:** the Hero subhead reads the agreed architect-framed copy; no layout regression.
- [x] Build it: `/develop hero repositioning copy`
- [x] Verify it: `/check verify hero repositioning copy` (PASS, 2026-09-18)
code in `src/sections/Hero.tsx`

### 15. SEO foundation · done
Meta tags, Open Graph and social share cards, sitemap, and structured data (Person schema) so the site looks professional when linked or shared and is discoverable in search.
**Done when:** every page has correct title/description meta; sharing the URL renders a proper social card; `sitemap.xml` is generated; a Person JSON-LD block validates.
- [x] Design it (spec): `/architect seo foundation`
- [x] Build it: `/develop seo foundation`
   - [x] Site config and SEO copy, layout and home metadata with canonical and Open Graph, satisfies AC-1, AC-3, AC-4
   - [x] Generated share cards (`next/og`) for `/` and `/products`, satisfies AC-4, AC-5
   - [x] `sitemap.xml`, `robots.txt`, and the ProfilePage/Person JSON-LD on `/`, satisfies AC-6, AC-7, AC-8, AC-9
   - [x] `/products` metadata, studio `X-Robots-Tag` header, lint, build, and live share and schema checks, satisfies AC-2, AC-10, AC-11
- [ ] Verify it: `/check verify seo foundation` (skipped, marked done on 2026-10-20)
spec [0009](../specs/0009-seo-foundation/index.md) · code in `src/app/(site)/layout.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/products/page.tsx`, `src/app/(site)/**/opengraph-image.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/site.ts`, `src/lib/og-card.tsx`, `src/lib/json-ld.ts`, `utils/data/seo-data.ts`, `next.config.mjs`

### 16. Skills marquee cleanup · done
Fix the Skills section rendering its 16 item list 4 times in the DOM (identified during site review); confirm icons carry alt/aria labels for screen readers and the marquee doesn't trap keyboard focus. code in `src/sections/Skills.jsx`, `tailwind.config.ts` (marquee keyframes)
**Done when:** the skill list renders without redundant DOM duplication (CSS driven looping instead), and passes a basic keyboard/screen reader pass.
- [x] Build it: `/develop skills marquee cleanup`
- [ ] Verify it: `/check verify skills marquee cleanup` (skipped, marked done on 2026-10-20)

### 17. On-site engagement tracking · done
Add Vercel Analytics custom events for the actions that actually signal recruiter interest: Contact Me clicks, CV downloads, and project/certification link clicks. code in `src/lib/analytics.ts` (events `contact_click`, `cv_download`, `link_click`), wired in `src/sections/Header.tsx`, `Footer.tsx`, `Hero.tsx`, `Projects.tsx`, `Badges.tsx`
**Done when:** each of the 3 action types fires a distinct named event, visible in the Vercel Analytics dashboard.
- [x] Build it: `/develop on-site engagement tracking`
- [ ] Verify it: `/check verify on-site engagement tracking` (skipped, marked done on 2026-10-20)

## Products

### 18. Public Products page · done
A public page that shows your product ecosystem: what is built, in progress, next, and planned, and how the products connect. The source today is the private "SMB Systems Map" artifact (15 systems plus their links). Only safe fields go public: name, status, a public summary, and the connections. Never notes, private repo links, lessons, or client names; RoomPOS is described generically ("POS for karaoke and room rental venues"). `/architect` decides whether the page reads a static, hand checked export (simplest and safe) or a live source.
**Done when:** the page lists every system grouped or filterable by status, shows how they connect, is reachable from the header, contains no private field or client name anywhere in the shipped bundle, and works in light and dark themes and on mobile.
- [x] Design it (spec): `/architect public products page`
- [x] Build it: `/develop public products page`
   - [x] Public only data file: types, 15 products with public summaries, 21 links, satisfies AC-2, AC-5
   - [x] `/products` route with status sections and cards, plus route aware header links, satisfies AC-1, AC-2, AC-3, AC-7, AC-8
   - [x] Connections on each card (Sends to, Receives from, Live/Planned, in page anchors), satisfies AC-4
   - [x] Polish and privacy sweep: themes, 375px layout, headings, focus, static build check, satisfies AC-5, AC-6
   - [x] Standalone flag: "Connections not mapped yet" for products with no drawn links, standalone message for JLPT only (spec 0002 update), satisfies AC-4, AC-5
- [x] Verify it: `/check verify public products page` (PASS 2026-10-05; second pass after the standalone flag PASS 2026-10-05)
spec [0002](../specs/0002-public-products-page/index.md) · code in `src/app/products/`, `src/sections/Products.tsx`, `utils/data/products-data.ts`, `src/lib/section-nav.ts`

## Studio foundation

### 19. Studio placement & stack · done · Beta
Decide where the private studio lives and what it runs on: a separate private deploy (your current lean, so client data and contract PDFs never ship with the public site) or a login gated `/studio` area in this same app, plus the database and where PDFs are stored. This is load bearing: every studio feature builds on it. Stays inside this repo; the move from Next.js 14 to Next 16 was approved on 2026-10-14 (spec 0003).
**Done when:** the placement, database, and file storage choice are recorded in a spec with the risks weighed honestly, and an empty studio shell boots locally next to the public site without leaking into the public build.
- [x] Design it (spec): `/architect studio placement & stack`
- [x] Build it: `/develop studio placement & stack`
   - [x] Next 16 + React 19 upgrade on the public site alone (ESLint 9, Turbopack), no regression, satisfies AC-1
   - [x] Route groups, two root layouts, studio layout, proxy and guard with the flag off (404 first), satisfies AC-3, AC-4
   - [x] Neon (preview branches), Drizzle, `studio` schema migration, migrate on build, satisfies AC-6, AC-7
   - [x] Private Blob stores, shell status lines, leak check, `.env.example`, satisfies AC-2, AC-5, AC-8
- [ ] Verify it: `/check verify studio placement & stack` (skipped, marked done on 2026-10-19)
- [ ] Test it: `/test studio placement & stack` (skipped, marked done on 2026-10-19)
spec [0003](../specs/0003-studio-placement-stack/index.md) · code in `src/app/(site)/`, `src/app/(studio)/`, `src/studio/`, `src/proxy.ts`, `drizzle/`, `scripts/`

### 20. Studio data model · done · Beta
Core records the studio builds on: clients, contacts, projects, contracts (with their status history), and systems with their links. Shaped so it can grow into your CRM and Invoicing products without a breaking migration.
**Done when:** the entities and relationships support client tracking, the contract lifecycle (draft → sent → signed → active → ended), and the systems map; seed data is clearly fake (no real client data); no secrets in the repo.
- [x] Design it (spec): `/architect studio data model`
- [x] Build it: `/develop studio data model`
   - [x] Thin thread: workspaces and clients tables, fixed workspace row, client count on the shell, guarded seed with one fake client, satisfies AC-1, AC-2, AC-7, AC-8
   - [x] The rest of the model: contacts, projects, systems, contracts, events, notes, links, resources with every constraint, append only trigger, all counts, satisfies AC-1, AC-2, AC-5, AC-8
   - [x] Contract lifecycle and archive rules, satisfies AC-3, AC-4, AC-6
   - [x] Full fake seed plus systems from public data, and the public boundary check, satisfies AC-3, AC-7, AC-9, AC-10
- [ ] Verify it: `/check verify studio data model` (skipped, marked done on 2026-10-19)
- [ ] Test it: `/test studio data model` (skipped, marked done on 2026-10-19)
spec [0004](../specs/0004-studio-data-model/index.md) · code in `src/studio/db/`, `src/studio/data/`, `drizzle/`, `scripts/seed-studio.ts`

### 21. Studio login · done · Beta
Single owner sign in (just you) that protects every studio page and every studio data request.
**Done when:** every studio route and data request rejects a signed out visitor; you can sign in and out; no credentials or secrets live in the repo.
- [x] Design it (spec): `/architect studio login`
- [x] Build it: `/develop studio login`
   - [x] Thin thread: five auth tables plus owner and membership rows, route groups, setup token enrollment, passkey sign in, session guard, satisfies AC-1, AC-3, AC-4, AC-5, AC-11
   - [x] Session lifecycle: proxy cookie check and refresh, `safeNext`, sliding expiry, sign out and sign out everywhere, recovery transaction, satisfies AC-1, AC-2, AC-4, AC-5, AC-7, AC-8
   - [x] Events, throttle, and screens: auth events and purge, setup throttle, login and setup in the vital-stats card look, security page with add another passkey, satisfies AC-6, AC-9, AC-10, AC-12, AC-14
   - [x] Config and production: `.env.example`, leak check and RP config build check, satisfies AC-13 (production enrollment in Vercel is still yours to do, skipped at done on 2026-10-19)
- [ ] Verify it: `/check verify studio login` (skipped, marked done on 2026-10-19)
- [ ] Test it: `/test studio login` (skipped, marked done on 2026-10-19)
spec [0005](../specs/0005-studio-login/index.md) · code in `src/studio/auth/`, `src/studio/guard.ts`, `src/proxy.ts`, `src/app/(studio)/`, `src/studio/data/workspace.ts`, `drizzle/`, `scripts/`

## Studio slice 1: Client tracking

### 22. Client tracking · done · Beta
The first real thread through the studio: sign in, add a client with contacts and projects, set a status, keep notes, find them again. This is the walking skeleton for the studio.
**Done when:** signed in, you can create, edit, and list clients with their contacts, projects, status, and notes; empty and error states render; signed out, none of it is reachable.
- [x] Design it (spec): `/architect client tracking`
- [x] Build it: `/develop client tracking`
   - [x] Thin thread: Clients link, list with paging and last activity, create client, detail page, shared helpers (input parsing, error unwrapping, client lock, not found), loading, error, and not found states, satisfies AC-1, AC-2, AC-4, AC-10
   - [x] Find, edit, archive: search, status filter, archived toggle, versioned client edit, archive dialog, read only archived client, satisfies AC-3, AC-5, AC-6
   - [x] Contacts, projects, notes: each with add, edit, archive or delete, the primary contact move, project date rules, notes newest first, satisfies AC-6, AC-7, AC-8, AC-9
   - [x] Hardening: error paths, logs free of personal data, mobile and both themes, lint, build, leak check, satisfies AC-10, AC-11, AC-12
- [ ] Verify it: `/check verify client tracking` · skipped 2026-10-19 (marked done after the build)
- [ ] Test it: `/test client tracking` · skipped 2026-10-19 (marked done after the build)
spec [0006](../specs/0006-client-tracking/index.md) · code in `src/app/(studio)/studio/(signed-in)/clients/`, `src/studio/clients/`, `src/studio/data/`, `src/studio/format.ts`

## Studio slice 2: Contracts

### 23. Contracts & PDF export · done · Beta
Fill a contract template for a client, export it as a PDF, and track it through draft → sent → signed → active → ended. Signing happens outside the app for now (no e-signature). The state machine is kept clean so it grows into Invoicing.
**Done when:** you can create a contract from a template for a client, export a correct PDF, move it only along allowed status steps with each change recorded, and see each client's contracts from the client view; PDFs are never publicly reachable.
- [x] Design it (spec): `/architect contracts & pdf export`
- [x] Build it: `/develop contracts & pdf export`
   - [x] Thin thread: migration (templates, contract body, contract files, append only trigger), placeholders and Markdown subset, react-pdf with bundled font, fake template seed, new template, new contract from a client, contract page with preview, draft PDF, mark sent freezing the PDF in private Blob, satisfies AC-1, AC-2, AC-3, AC-5, AC-6, AC-11, AC-12
   - [x] Every step and the signed copy: all status steps with confirm and note, archived client refusal, back to draft and resend, signed copy upload, files list and files route, satisfies AC-7, AC-8, AC-10, AC-11
   - [x] Edit, archive, and lists: template edit and archive, draft only contract edit, contract archive, client page Contracts section, `/studio/contracts` list, nav links, satisfies AC-1, AC-4, AC-9, AC-10
   - [x] Hardening: loading, error, and not found states, error paths, logs free of contract text, mobile and both themes, lint, build, leak check, production build PDF check, satisfies AC-11, AC-13
- [ ] Verify it: `/check verify contracts & pdf export` · skipped 2026-10-19 (marked done after the build)
- [ ] Test it: `/test contracts & pdf export` · skipped 2026-10-19 (marked done after the build)
spec [0007](../specs/0007-contracts-pdf-export/index.md) · code in `src/studio/contracts/`, `src/studio/data/contracts.ts`, `src/studio/data/contract-templates.ts`, `src/studio/data/contract-files.ts`, `src/app/(studio)/studio/(signed-in)/contracts/`, `src/app/(studio)/studio/(signed-in)/templates/`

## Studio slice 3: Private systems map

### 24. Private systems map · done · Beta
Move the full SMB Systems Map (every field, including private notes, lessons, and repo links) into the studio so it replaces the Claude artifact as your tracker. Decide how the public Products page (feature 18) stays in sync without ever exposing private fields.
**Done when:** all 15 systems and their links are in the studio and editable; private fields show only when signed in; the public Products page still shows only the safe fields.
- [x] Design it (spec): `/architect private systems map`
- [x] Build it: `/develop private systems map`
   - [x] Thin thread: `layer` and `published` migration, seed update, Systems nav, board, read only detail, public projection, drift banner, export of `products-data.ts`, satisfies AC-1, AC-2, AC-9, AC-10, AC-11
   - [x] Import: paste JSON page, parser and planner with the artifact field mapping, preview with row errors, one transaction apply, rerun stays unchanged, satisfies AC-7, AC-8
   - [x] Edit everything: create and edit systems, published flag, archive and restore, links, resources, system notes, satisfies AC-3, AC-4, AC-5, AC-6
   - [x] Hardening and the real move: states, logs, mobile and both themes, lint, build, leak check, production import, export, commit the public file, satisfies AC-10, AC-11, AC-12 (production import and export done 2026-10-20; the import was batched after it timed out on Vercel)
- [ ] Verify it: `/check verify private systems map` · skipped 2026-10-20 (marked done after the build)
- [ ] Test it: `/test private systems map` · skipped 2026-10-20 (marked done after the build)
spec [0008](../specs/0008-private-systems-map/index.md) · code in `src/studio/systems/`, `src/studio/data/systems.ts`, `src/app/(studio)/studio/(signed-in)/systems/`

## Studio slice 4: Lead intake

### 25. Lead intake form · in-progress · Beta
Let prospective freelance clients submit their name, email, and project description from the public portfolio, with company and budget optional. Keep submissions in a separate private studio inquiry inbox, notify you by email, and let you explicitly convert a suitable inquiry into a client with Lead status.
**Done when:** a visitor can submit a valid inquiry and see an on screen confirmation; the inquiry is saved privately and you receive an email notification; you can review it in the signed in studio and deliberately convert it into a client lead without losing the original inquiry or creating duplicate clients on a repeated conversion; signed out visitors cannot read inquiries, and validation, submission errors, and notification failures have defined behavior.
- [x] Design it (spec): `/architect lead intake form` (recommended decisions and design confirmation delegated on 2026-10-21)
- [x] Build it: `/develop lead intake form` (2026-10-21, fake development data only; production intake remains disabled)
   - [x] Thin intake thread: data model, `/contact`, validation, challenge, rate limits, submission retries, and private inbox read, satisfies AC-1 through AC-5, AC-10, AC-11
   - [x] Inbox and conversion: filters, paging, status history, version checks, and atomic client/contact/note linking, satisfies AC-5 through AC-7, AC-10
   - [x] Alerts and retention: owner email, safe retries, daily cleanup, and configuration checks, satisfies AC-4, AC-8 through AC-11
   - [x] Polish: themes, keyboard access, SEO, privacy, concurrency and failure checks, lint, build, and leak check, satisfies AC-1 through AC-12
- [ ] Verify it: `/check verify lead intake form`
- [ ] Test it: `/test lead intake form`
spec [0010](../specs/0010-lead-intake/index.md) · Jira [DP-72](https://vital-stats.atlassian.net/browse/DP-72) · code in `src/inquiries/`, `src/studio/data/inquiries.ts`, `src/studio/inquiries/`, `src/app/(studio)/studio/(signed-in)/inquiries/`, `src/app/(site)/contact/`

Product choices confirmed on 2026-10-21: dedicated `/contact`; required name, email, and project description; optional company and free text budget; New, Reviewing, Converted, and Closed inbox states; deliberate linking to an existing client or creating a Lead; owner email alerts with visible manual retry after failure; visitor on screen confirmation; 12 month inquiry retention. Visitor receipts are outside this slice. Tracer Bullet follows the project default. Beta covers public submissions and stored contact details. Spec 0010 settles the remaining design under the engineer's delegated recommended choices. Production setup still needs sender domain verification, owner recipient, bot challenge configuration, and deployment secrets. Jira mirrored on 2026-10-21: DP-72, Design DP-73 (done), Build DP-74, Verify DP-75, Test DP-76. Converted client record retention remains a separate deferred decision.

## Deferred
Out of scope for this pass, kept so the plan stays honest.
- **ED Solutions rebrand**: rename the public site to ED Solutions with a brand pass (wordmark, palette, type), revisit copy, metadata, and favicon; SEO foundation (feature 15) should then point at the new name · needs a decision
- **E-signature**: sign contracts inside the studio · needs a decision
- **Archived contact data retention**: decide how long archived contacts' personal data is kept before real client data lands (Data Privacy Act), from spec 0004 · needs a decision
- **Invoicing**: invoices from active contracts, the next step toward your Invoicing product · needs a decision
- **Studio security extras**: rename and remove passkeys (never the last), an active sessions list, and a recent activity view over auth events; fits spec 0005's tables with no migration, from spec 0005
- **Client search extras**: match contact names and emails in the client search, and a `pg_trgm` index once the list passes about 5,000 rows, from spec 0006 · needs a decision
- **Archived contacts and projects view**: see archived contacts and projects of a client (hidden in feature 22), from spec 0006
- **Notes on contacts and projects**: the notes table already supports them; feature 22 writes client notes only, from spec 0006
- **Contract extras**: contract notes, unarchive, a richer PDF layout (logo, tables, two column signature block), and business details as workspace fields for Invoicing, from spec 0007 · needs a decision
- **Blob orphan cleanup**: a manual script that deletes private contract files with no `contract_files` row, from spec 0007
- **Systems map diagram**: a drawn map of systems and links in the studio, like the old artifact's view, from spec 0008
- **Export as a pull request**: the systems export opens a pull request with the new `products-data.ts` instead of a download, from spec 0008 · needs a decision
- **SEO extras**: a real headshot for the Person JSON-LD `image`, the Archivo font in the share cards, and Google Search Console sitemap submission, from spec 0009

- **Studio error visibility**: revisit how you detect and investigate studio failures when real client data lands, from spec 0003. Needs a decision.
- **Studio separation review**: revisit whether the studio should run separately if it grows to hold many real client contracts, from spec 0003. Needs a decision.
- **Shared Platform connections**: record the platform's real system links once they are known, then regenerate the public export, from spec 0002.
- **Retire the old systems artifact**: after verifying the production import, decide whether to leave the old SMB Systems Map artifact read only or retire it, from spec 0008. This is an owner action outside the repo.

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies, so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow-up enrolled |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Alpha` → after `/check verify`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default (`Alpha`).
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.

_Drafted by /scope from the repo and this conversation, worth a quick human pass._
