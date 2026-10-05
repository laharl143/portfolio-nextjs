# Erskine Duenas, Portfolio (portfolio-next)

## Stack

- **Language / Runtime**: TypeScript, Node 20+
- **Framework**: Next.js 14.2 (App Router), React 18
- **Key dependencies**: Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion (`motion` package), react-icons, @vercel/analytics
- **Package manager**: npm

## Build approach

Tracer Bullet (each feature is built complete and working end to end before moving to the next). Source: the `docs/scope/scope.md` header.

## Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Test
# no test framework configured yet
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`, or a directory `docs/specs/NNNN-title/` with `index.md` (build spec), `rationale.md`, and `verify.md` (the `/check verify` checklist).

## Project tracking

`docs/scope/scope.md` is the pipeline's real operating memory (the skills read/write it directly). Jira project `DP` (dev-portfolio, site `vital-stats.atlassian.net`) mirrors it for day to day tracking: Epics = phases (`DP-1` existing, `DP-2` next slice, `DP-32` products page, `DP-33` studio), Stories = features, Subtasks = the exact skill commands (`Design it (/architect)`, `Build it (/develop)`, `Verify it (/check verify)`). After any `/scope`, `/architect`, `/develop`, or `/check verify` run that changes a feature's status, mirror the change into the matching Jira issue (status transition, new subtask, or updated description) so Jira stays accurate. `docs/scope/scope.md` is the source of truth on any conflict.

## Rules

- When a feature in `docs/scope/scope.md` is marked `done` (by any skill, or directly by the engineer), commit that feature's changed files with a descriptive message and push to the tracking remote branch right after. No confirmation needed for this specific commit and push; other git operations still confirm as usual.
- Page sections live in `src/sections/` (Hero, Header, Badges, Projects, Skills, FAQs, Testimonials, Footer, Intro) and are composed in `src/app/page.tsx`. Other routes live in `src/app/<route>/page.tsx` and reuse `Header` and `Footer` (e.g. `/products` composes `src/sections/Products.tsx`).
- Header and footer section links use `/#<section-id>` hrefs and call `scrollToSectionIfSamePage` from `src/lib/section-nav.ts`, so they smooth scroll on `/` and navigate home from any other route. Follow this for any new section link.
- `utils/data/products-data.ts` feeds the public `/products` page and holds public fields only (id, name, status, summary, links). Never add notes, lessons, stack, repo links, ticket keys, or client names there; the `PublicProduct` type rejects extra fields (spec 0002).
- Reusable UI primitives live in `src/components/ui/`, following shadcn/ui conventions (`components.json`: style "new-york", Radix-based, class merging via `cn()` in `src/lib/utils.ts`).
- Path alias `@/*` maps to `src/*`.
- Content/data lives in `utils/data/*.js` and `utils/data/*.ts` (badges, personal info, skills, products) and is imported into section components rather than hardcoded inline.
- Interactive client sections are marked `"use client"` at the top of the file (e.g. `Hero.tsx`).
- Dark/light theme handled via `next-themes` + `ThemeToggleButton`.
- File extensions are mixed (`.tsx` and `.jsx` both appear in `src/sections`, e.g. `Skills.jsx`); no enforced convention yet.

## Agent skills

- [shadcn-ui](.claude/skills/shadcn-ui/): `jezweb/claude-skills`, component selection and install conventions matching this project's shadcn setup
- [tailwindcss-advanced-layouts](.claude/skills/tailwindcss-advanced-layouts/): `josiahsiegel/claude-plugin-marketplace`, Tailwind Grid/Flexbox layout patterns
- [framer-motion-animator](.claude/skills/framer-motion-animator/): `patricio0312rev/skills`, Framer Motion (`motion` package) animation conventions

Declined: Vercel deployment

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
