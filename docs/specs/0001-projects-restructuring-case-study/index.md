# 0001. Tier the Projects section and add an agentic pipeline case study

**Date**: 2026-09-18
**Status**: Accepted

## Summary

The Projects section currently lists all 9 projects as one flat, equally weighted list, from a live deployed app down to five vanilla JS practice exercises. This buries the work that actually shows senior/architect level skill. This decision restructures it into 3 visually distinct tiers (Flagship, In Progress, Foundations) and adds a new Flagship card, a short case study describing the multi agent orchestration pipeline work from the engineer's CV, so a recruiter scanning the page sees the strongest signal first.

## Requirements

**User stories**:
- As a recruiter or hiring manager skimming the site, I want to immediately see Ed's strongest, most senior work, so that I form an accurate first impression before I decide whether to read further.
- As Ed, I want my learning exercises to stay on the site (they show growth) without competing visually with my real, senior level work.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: The Projects section renders 3 visually distinct tiers, in this order: Flagship, In Progress, Foundations.
- **AC-2**: The Flagship tier contains, in order, Vital Stats, then the new agentic pipeline case study card.
- **AC-3**: The case study card shows a problem, approach, and outcome (short form, matching the CV's own framing) plus a visual, and carries no outbound link (it documents Ed's own methodology, not a public repo).
- **AC-4**: The Foundations tier (the 5 vanilla JS exercises) is collapsed by default behind a show all toggle, reusing the same expand and collapse interaction already built for Certifications curation (`src/sections/Badges.tsx`).
- **AC-5**: The Flagship tier is visually larger and more prominent than In Progress and Foundations, on both desktop and mobile; tier order stays the same on mobile, stacked top to bottom.
- **AC-6**: A project whose image fails to load shows a plain, on brand placeholder block with the project name, never a broken image icon.
- **AC-7**: Every tier, the case study card, and the show all toggle have correct alt text and are fully keyboard operable (matches the project's basic accessibility hygiene target).
- **AC-8**: The In Progress tier keeps its existing "Coming Soon!" and "In Progress!" hover banners and the tech stack hover reveal, unchanged.

## Decision

**Chosen option**: Option 1: Fix in place, extend the existing component.

Add a `tier` and `kind` field to the existing data array, group the render into 3 tiers, add a Foundations show all toggle that reuses the `Badges.tsx` pattern, and add a case study card variant, all within `Projects.tsx`.

**Implementation skills**: `tailwindcss-advanced-layouts` (`.claude/skills/tailwindcss-advanced-layouts/`, grid and spacing patterns for the tiered layout) · `framer-motion-animator` (`.claude/skills/framer-motion-animator/`, the `motion` package already used for hover/reveal transitions elsewhere on the site) · `shadcn-ui` (`.claude/skills/shadcn-ui/`, component conventions if a new primitive is needed for the case study card)

See `rationale.md` for the context, the options considered, and why Option 1 won.

## Feature design

**Data model sketch**:

Entity `ProjectItem` (a plain array in `src/sections/Projects.tsx`, no database):
- `name`: string, required
- `tier`: `'flagship' | 'in-progress' | 'foundations'`, required
- `kind`: `'project' | 'case-study'`, required, defaults to `'project'`
- `tech`: string[], required for `kind: 'project'`; empty or omitted for the case study
- `image`: StaticImageData or string, required
- `href`: string or null; null for the case study card and for any item with no live link
- `comingSoon`: boolean, optional, unchanged from today
- `inProgress`: boolean, optional, unchanged from today
- `caseStudyBody`: `{ problem: string; approach: string; outcome: string }`, required only when `kind: 'case-study'`

No relationships; this is a flat, local array, the same shape family as `utils/data/badges-data.js`.

**State transitions**: Foundations tier: `collapsed` (default) to `expanded`, toggled by the same show all and show featured only button pattern already built in `Badges.tsx`. No other state.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Render the case study card | Problem, approach, outcome text | Drafted below in this spec (from `docs/cv-ibm-2026.md`'s agentic pipeline description); the engineer may edit before `/develop` builds it |
| Render the case study card | Visual image | An export or screenshot of the Miro board `https://miro.com/app/board/uXjVHlORVG8=/` (the jsmastery-pro/skills pipeline flowchart), saved by the engineer as a static asset under `src/assets/images/`; falls back to the AC-6 placeholder block until provided |
| Render each project row | Tier grouping | The `tier` field on that entry in the `projects` array |
| Render the Foundations tier | Expanded or collapsed state | Local component state, the same `showAll` pattern as `src/sections/Badges.tsx` |
| Render any project image | Fallback content on load failure | An `onError` handler on the `next/image` element, rendering the AC-6 placeholder |

**Drafted case study copy** (for `caseStudyBody`, the engineer may edit before build):
- **Problem**: "Repetitive audit and review work on every change was eating time that should go to the judgment calls only a senior engineer can make."
- **Approach**: "Architected and built a multi agent orchestration pipeline that automates the full development lifecycle: code audit, security audit, implementation, code review, and PR creation, while keeping final review and merge authority with a human on every PR."
- **Outcome**: "Cut turnaround on production and hotfix work to same day across multiple linked tickets, without giving up the rigor of human oversight where it matters most."

**Key invariants**:
- Exactly one Flagship, one In Progress, and one Foundations tier render, in that order, every time the section renders (tier grouping is derived from data, never hand ordered per render).
- The case study card is the only item with `kind: 'case-study'`; every other item defaults to `kind: 'project'`.
- The Foundations tier never renders expanded by default.

**Security model**: Not applicable. Public marketing content, no user data, no auth.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: page loads, Flagship (Vital Stats, then case study) renders above In Progress, Foundations is collapsed below a show all toggle, verifies **AC-1**, **AC-2**, **AC-4**.
- Case study content: the case study card shows problem, approach, outcome text and a visual, has no outbound link, verifies **AC-3**.
- Visual hierarchy: Flagship cards render visibly larger than In Progress and Foundations items, on both a desktop and a mobile viewport, verifies **AC-5**.
- Failure case: a project image URL is broken, the row shows the on brand placeholder block instead of a broken image icon, verifies **AC-6**.
- Accessibility: tab through every tier and the toggle with a keyboard only, every image has correct alt text, verifies **AC-7**.
- Regression: an In Progress item still shows its "In Progress!" hover banner and tech stack reveal exactly as before, verifies **AC-8**.

## Build plan

1. [x] Extend the `projects` data array in `src/sections/Projects.tsx` with `tier` and `kind` fields per the confirmed mapping (Vital Stats and the new case study entry as `flagship`; Airbnb Clone, the POS platform, and the food delivery system as `in-progress`; the 5 vanilla JS exercises as `foundations`), satisfies **AC-1**, **AC-2**
2. [x] Group the render into 3 tier sections in order (Flagship, In Progress, Foundations), reusing the existing row markup for Flagship and In Progress, satisfies **AC-1**, **AC-8**
3. [x] Add the Foundations show all and show featured only toggle, mirroring the `showAll` state and button pattern in `src/sections/Badges.tsx`, satisfies **AC-4**
4. [x] Build the case study card variant (problem, approach, outcome layout plus the visual), using the drafted copy above, satisfies **AC-2**, **AC-3**
5. [x] Add the image `onError` fallback (on brand placeholder block with the project name) to the shared row renderer, satisfies **AC-6**
6. [x] Apply visual weight differentiation for the Flagship tier (larger card size or spacing versus In Progress and Foundations), confirmed to hold on mobile, satisfies **AC-5**
7. [x] Accessibility pass across all 3 tiers and the toggle (alt text, keyboard operability), satisfies **AC-7**

## Consequences

**Positive**:
- A recruiter sees Ed's strongest, most senior signal (the case study and Vital Stats) before any lower weight content, directly addressing the CV to portfolio mismatch.
- Reuses the same interaction language as the Certifications curation work, so the site feels consistent to a repeat visitor.
- No new dependencies or environment variables.

**Negative / tradeoffs**:
- `Projects.tsx`'s render logic grows more branching (tier grouping, the case study variant, collapse state) inside one file; if the section keeps growing, Option 2's subcomponent split becomes worth revisiting.
- The case study's visual depends on a manual export step (screenshotting the Miro board) outside the automated pipeline, so it may ship with the AC-6 placeholder until the engineer provides the real image.

**Neutral**:
- The existing "Coming Soon!" and "In Progress!" banners and tech stack hover reveal are preserved unchanged for the In Progress tier.
- The drafted case study copy is a starting point; the engineer may revise it before `/develop` builds this.

## Follow-up

- [x] ~~Engineer to export or screenshot the jsmastery-pro/skills pipeline flowchart from Miro (`https://miro.com/app/board/uXjVHlORVG8=/`) and add it to `src/assets/images/` for the case study card; until then `/develop` uses the AC-6 placeholder fallback.~~ No longer needed, see Amendment.
- [x] ~~Engineer to review or edit the drafted case study copy (problem, approach, outcome) above before `/develop` builds it.~~ No longer needed, see Amendment.

## Amendment (2026-09-18)

The engineer decided against the case study card after seeing it live: it read as too self referential for the site. Removed from `Projects.tsx`; the Flagship tier now holds only Vital Stats. **AC-2** and **AC-3** (the case study's existence and content) are dropped, superseded by this amendment; all other acceptance criteria (AC-1, AC-4 through AC-8) still hold and are unaffected. The feature stays `done`; this amendment is the current record of what actually shipped.
