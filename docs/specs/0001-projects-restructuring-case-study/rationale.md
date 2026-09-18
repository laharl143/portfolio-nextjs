# 0001. Tier the Projects section and add an agentic pipeline case study — rationale

## Context

Ed is job hunting for a mid to senior software engineer or architect track role. His CV describes real, senior level work (architecting multi agent orchestration pipelines across three production projects, automating a full development lifecycle: code audit, security audit, implementation, code review, and PR creation, with human review retained on every PR). None of that appears on the live site.

The current `Projects.tsx` renders a single flat array (`Vital Stats`, `Airbnb Clone`, `Integrated Restaurant POS Platform`, `Cloud-Based Food Delivery System`, then five vanilla JS exercises: `Simon game`, `Drum kit`, `Maze`, `Quote Generator`, `Movie Fight`) with no grouping. Each row uses the same hover reveal interaction (tech stack chips, a preview image, an arrow) regardless of whether the project is a real deployed app or a learning exercise. A recruiter has to scroll past the same weight of visual attention on a Simon game clone as on the live Vital Stats app.

The consequence of not deciding: the site keeps contradicting the CV. A hiring manager who reads both sees a senior engineer's resume paired with a junior looking portfolio, which is a real risk to how Ed gets perceived in a screen that often lasts under a minute.

## Options considered

### Option 1: Fix in place, extend the existing component

Add a `tier` field (and a `kind: 'case-study'` variant) to the existing `projects` data array in `Projects.tsx`, group the render by tier, and reuse the existing hover reveal row pattern for Flagship and In Progress, with a collapse toggle added for Foundations (mirroring `Badges.tsx`).

**Pros**:
- Reuses a pattern that already works and is already familiar from `Badges.tsx` (same toggle interaction, same visual language).
- Lowest risk: no new files, no new dependencies, small diff.
- Matches the Tracer Bullet approach: ships a complete, real, working slice end to end.

**Cons**:
- `Projects.tsx`'s render logic grows more branching in one file (tier grouping, a case study variant, collapse state).

### Option 2: Extract tier and case study into new subcomponents

Split the section into a `FlagshipTier`, `InProgressTier`, `FoundationsTier`, and a dedicated `CaseStudyCard` component, composed by the parent section.

**Pros**:
- Cleaner separation if the section keeps growing (a 4th tier, more case studies later).
- Keeps the case study's distinct markup out of the shared row renderer.

**Cons**:
- More new files and wiring for a feature this size; the section has 9 items total, not enough to justify the extra structure yet.
- Slower to ship, more surface for the interaction (hover reveal, banners) to drift between the original and the new components.

### Option 3: Full redesign from scratch

Replace the current group hover row pattern entirely with a new card grid design.

**Pros**:
- A chance to visually refresh the whole section.

**Cons**:
- Throws away an interaction pattern that already works and that users (recruiters) have no complaint about; the actual decision needed is tiering plus one new card, not a redesign.
- Highest risk and most time for a decision that doesn't call for it.

## Rationale

The existing hover reveal pattern is proven and already reused once this session (the Certifications curation toggle mirrors it in spirit). The project is small (19 source files, one engineer) and the scope header sets Tracer Bullet as the build approach, thin, complete, working slices over new structure. Option 2's extra components would pay off if the Projects section kept growing past 3 tiers or multiple case studies, but nothing in the current scope calls for that yet, so the cost isn't justified today. Option 3 is out of proportion to the actual decision, which is tiering plus one new card, not a section redesign.
