# Verify: projects restructuring & case study · spec 0001 · updated 2026-09-18
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Load `/#projects` → Flagship renders first (Vital Stats, then the case study card), then In Progress, then Foundations → AC-1
- [x] Flagship tier order: Vital Stats appears before the agentic pipeline case study card → AC-2
- [x] Case study card shows problem, approach, and outcome text plus a visual, and has no outbound link or arrow control → AC-3
- [x] Foundations tier is collapsed on load (no items visible, only the toggle) → AC-4
- [x] Click "Show all N learning projects" → all 5 Foundations items expand; click again → collapses back → AC-4
- [x] Compare a Flagship row's size/text against an In Progress row, on both a desktop and a mobile viewport width → Flagship is visibly larger and more prominent on both, and tier order stays the same on mobile → AC-5
- [x] Point a project's `image` at a path that fails to load → the row shows the on brand placeholder block with the project name, never a broken image icon → AC-6
- [x] Tab through every tier and the Foundations toggle using keyboard only (no mouse) → every interactive element is reachable and operable, every image (including the case study visual) has correct alt text → AC-7
- [x] Hover an In Progress item (e.g. Airbnb Clone) → "In Progress!" banner and tech stack chip reveal still appear exactly as before → AC-8
- [x] Hover a Coming Soon item (e.g. Integrated Restaurant POS Platform) → "Coming Soon!" banner still appears → AC-8

## Commands
- [x] `npx tsc --noEmit` → no errors → confirms the `ProjectItem` data shape and tier grouping typecheck

## Value sourcing coverage
- [x] Case study problem/approach/outcome text renders exactly the drafted copy from `caseStudyBody` in `Projects.tsx` (or the engineer's edited version, if changed) → covers the case study text sourcing row
- [x] Case study visual: with no Miro export present in `src/assets/images/`, the AC-6 placeholder renders in its place (not a broken image or blank space) → covers the case study visual sourcing row
- [x] Each project's tier badge/grouping matches its `tier` field in the data array (spot check one item per tier) → covers the tier grouping sourcing row
- [x] Foundations expand/collapse state is local and resets on page reload (not persisted) → covers the state sourcing row
- [x] An image `onError` fires the placeholder fallback rather than a broken image icon, for any project image, not only the case study's → covers the image fallback sourcing row

## Acceptance-criteria coverage
- AC-1 … tier order and grouping · AC-2 … Flagship contents and order · AC-3 … case study content and no outbound link · AC-4 … Foundations collapse/expand · AC-5 … Flagship visual weight, desktop + mobile · AC-6 … image failure placeholder · AC-7 … alt text + keyboard operability · AC-8 … In Progress banners and hover reveal unchanged
