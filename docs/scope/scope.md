# Scope: Erskine Duenas, Portfolio Site

A personal portfolio site (Next.js) used to job hunt for a mid to senior software engineer or architect track role. This pass repositions the content and adds the cross cutting groundwork (SEO, light performance and accessibility hygiene, engagement tracking) a job hunting site needs.

**Build approach:** Tracer Bullet (each feature is built complete and working end to end before moving to the next; no throwaway shell, no MVP left half grown).
**Workflow:** Alpha (`/check verify` after `/develop`; no formal test suite or second model review by default). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Hero & intro | Existing | existing |
| 2 | Header & navigation | Existing | existing |
| 3 | Certifications & Badges | Existing | in-progress |
| 4 | Skills marquee | Existing | existing |
| 5 | Projects showcase | Existing | existing |
| 6 | Testimonials | Existing | existing |
| 7 | FAQs | Existing | existing |
| 8 | Footer & contact | Existing | existing |
| 9 | Theme toggle | Existing | existing |
| 10 | CV download | Existing | existing |
| 11 | Analytics (page views) | Existing | existing |
| 12 | Projects restructuring & case study | Next slice | planned |
| 13 | Certifications curation | Next slice | in-progress |
| 14 | Hero repositioning copy | Next slice | planned |
| 15 | SEO foundation | Next slice | planned |
| 16 | Skills marquee cleanup | Next slice | planned |
| 17 | On-site engagement tracking | Next slice | planned |

## Existing

### 1. Hero & intro · existing
Landing hero with name, role tagline, mission statement, CV download, and social links. code in `src/sections/Hero.tsx`, `src/sections/Intro.tsx`

### 2. Header & navigation · existing
Sticky nav across About, Certifications, Skills, Projects, FAQs, Contact. code in `src/sections/Header.tsx`

### 3. Certifications & Badges · in-progress
Certification wall pulling from Credly. 21 of Credly's public badges are synced to `badges-data.js` (an earlier duplicate credential ID bug was fixed along the way); 2 Oracle Cloud certifications are not on Credly's public feed and are still pending links/images from you; the flat, uncurated 21 badge display has not yet been reworked into a featured plus collapsible view. code in `src/sections/Badges.tsx`, `utils/data/badges-data.js`

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

### 12. Projects restructuring & case study · needs a decision
Replace the flat project list with a tiered layout (flagship case study plus real project, in progress work, and foundations/learning projects collapsed), including a new case study for the multi agent orchestration pipeline work from your CV, so the site reflects the seniority your CV already shows.
**Done when:** the Projects section renders 3 visually distinct tiers; the agentic pipeline case study is written and live; vanilla JS exercises are collapsed out of the primary view; alt text and keyboard navigation work across all tiers.
- [ ] Design it (spec): `/architect projects restructuring & case study`

### 13. Certifications curation · in-progress
Finish the certification work already underway: rework the flat 23 badge grid into a featured row (3 to 4 top credentials) with the rest behind a "show all" toggle, as discussed.
**Done when:** the section shows a featured set by default with the full set behind one click; filter buttons still work against the full set.
- [x] Build it: `/develop certifications curation`
   - [x] Add the 2 Oracle certs (live: AI Foundations Associate + Foundations Associate, both issued May 24, 2026)
   - [x] Featured row (4 credentials: IBM Generative & Agentic AI Developer, both AWS Agentic/Generative AI Essentials badges, Oracle AI Foundations Associate) plus "show all"/"show featured only" toggle for the rest
- [ ] Verify it: `/check verify certifications curation`
code in `src/sections/Badges.tsx`, `utils/data/badges-data.js`

### 14. Hero repositioning copy · planned
Swap the generic "back-end focused, full-stack capable" subhead for language that plants the architect framing up top, per the copy already drafted in this project's history.
**Done when:** the Hero subhead reads the agreed architect-framed copy; no layout regression.
- [ ] Build it: `/develop hero repositioning copy`
- [ ] Verify it: `/check verify hero repositioning copy`

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
