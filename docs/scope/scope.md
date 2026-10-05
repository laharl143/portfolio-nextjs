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
| 15 | SEO foundation | Next slice | planned |
| 16 | Skills marquee cleanup | Next slice | planned |
| 17 | On-site engagement tracking | Next slice | planned |
| 18 | Public Products page | Products | done |
| 19 | Studio placement & stack | Studio foundation | planned |
| 20 | Studio data model | Studio foundation | planned |
| 21 | Studio login | Studio foundation | planned |
| 22 | Client tracking | Studio slice 1 | planned |
| 23 | Contracts & PDF export | Studio slice 2 | planned |
| 24 | Private systems map | Studio slice 3 | planned |

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

### 15. SEO foundation · needs a decision
Meta tags, Open Graph and social share cards, sitemap, and structured data (Person schema) so the site looks professional when linked or shared and is discoverable in search.
**Done when:** every page has correct title/description meta; sharing the URL renders a proper social card; `sitemap.xml` is generated; a Person JSON-LD block validates.
- [ ] Design it (spec): `/architect seo foundation`

### 16. Skills marquee cleanup · planned
Fix the Skills section rendering its 16 item list 4 times in the DOM (identified during site review); confirm icons carry alt/aria labels for screen readers and the marquee doesn't trap keyboard focus.
**Done when:** the skill list renders without redundant DOM duplication (CSS driven looping instead), and passes a basic keyboard/screen reader pass.
- [ ] Build it: `/develop skills marquee cleanup`
- [ ] Verify it: `/check verify skills marquee cleanup`

### 17. On-site engagement tracking · planned
Add Vercel Analytics custom events for the actions that actually signal recruiter interest: Contact Me clicks, CV downloads, and project/certification link clicks.
**Done when:** each of the 3 action types fires a distinct named event, visible in the Vercel Analytics dashboard.
- [ ] Build it: `/develop on-site engagement tracking`
- [ ] Verify it: `/check verify on-site engagement tracking`

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
- [x] Verify it: `/check verify public products page` (PASS, 2026-10-05)
spec [0002](../specs/0002-public-products-page/index.md) · code in `src/app/products/`, `src/sections/Products.tsx`, `utils/data/products-data.ts`, `src/lib/section-nav.ts`

## Studio foundation

### 19. Studio placement & stack · needs a decision · Beta
Decide where the private studio lives and what it runs on: a separate private deploy (your current lean, so client data and contract PDFs never ship with the public site) or a login gated `/studio` area in this same app, plus the database and where PDFs are stored. This is load bearing: every studio feature builds on it. Stays inside this repo and on Next.js 14 unless you approve otherwise.
**Done when:** the placement, database, and file storage choice are recorded in a spec with the risks weighed honestly, and an empty studio shell boots locally next to the public site without leaking into the public build.
- [ ] Design it (spec): `/architect studio placement & stack`

### 20. Studio data model · needs a decision · Beta
Core records the studio builds on: clients, contacts, projects, contracts (with their status history), and systems with their links. Shaped so it can grow into your CRM and Invoicing products without a breaking migration.
**Done when:** the entities and relationships support client tracking, the contract lifecycle (draft → sent → signed → active → ended), and the systems map; seed data is clearly fake (no real client data); no secrets in the repo.
- [ ] Design it (spec): `/architect studio data model`

### 21. Studio login · needs a decision · Beta
Single owner sign in (just you) that protects every studio page and every studio data request.
**Done when:** every studio route and data request rejects a signed out visitor; you can sign in and out; no credentials or secrets live in the repo.
- [ ] Design it (spec): `/architect studio login`

## Studio slice 1: Client tracking

### 22. Client tracking · needs a decision · Beta
The first real thread through the studio: sign in, add a client with contacts and projects, set a status, keep notes, find them again. This is the walking skeleton for the studio.
**Done when:** signed in, you can create, edit, and list clients with their contacts, projects, status, and notes; empty and error states render; signed out, none of it is reachable.
- [ ] Design it (spec): `/architect client tracking`

## Studio slice 2: Contracts

### 23. Contracts & PDF export · needs a decision · Beta
Fill a contract template for a client, export it as a PDF, and track it through draft → sent → signed → active → ended. Signing happens outside the app for now (no e-signature). The state machine is kept clean so it grows into Invoicing.
**Done when:** you can create a contract from a template for a client, export a correct PDF, move it only along allowed status steps with each change recorded, and see each client's contracts from the client view; PDFs are never publicly reachable.
- [ ] Design it (spec): `/architect contracts & pdf export`

## Studio slice 3: Private systems map

### 24. Private systems map · needs a decision · Beta
Move the full SMB Systems Map (every field, including private notes, lessons, and repo links) into the studio so it replaces the Claude artifact as your tracker. Decide how the public Products page (feature 18) stays in sync without ever exposing private fields.
**Done when:** all 15 systems and their links are in the studio and editable; private fields show only when signed in; the public Products page still shows only the safe fields.
- [ ] Design it (spec): `/architect private systems map`

## Deferred
Out of scope for this pass, kept so the plan stays honest.
- **ED Solutions rebrand**: rename the public site to ED Solutions with a brand pass (wordmark, palette, type), revisit copy, metadata, and favicon; SEO foundation (feature 15) should then point at the new name · needs a decision
- **Lead intake form**: a public inquiry form that lands as a new lead in studio client tracking · needs a decision
- **E-signature**: sign contracts inside the studio · needs a decision
- **Invoicing**: invoices from active contracts, the next step toward your Invoicing product · needs a decision

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
