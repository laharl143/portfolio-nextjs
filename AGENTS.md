# Erskine Duenas, Portfolio (portfolio-next)

## Stack

- **Language / Runtime**: TypeScript, Node 20+
- **Framework**: Next.js 14.2 (App Router), React 18
- **Key dependencies**: Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion (`motion` package), react-icons, @vercel/analytics
- **Package manager**: npm

## Build approach

<TBD, set by /scope>

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

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Project tracking

`docs/scope/scope.md` is the pipeline's real operating memory (the skills read/write it directly). Jira project `DP` (dev-portfolio, site `vital-stats.atlassian.net`) mirrors it for day to day tracking: Epics = phases (`DP-1` existing, `DP-2` next slice), Stories = features, Subtasks = the exact skill commands (`Design it (/architect)`, `Build it (/develop)`, `Verify it (/check verify)`). After any `/scope`, `/architect`, `/develop`, or `/check verify` run that changes a feature's status, mirror the change into the matching Jira issue (status transition, new subtask, or updated description) so Jira stays accurate. `docs/scope/scope.md` is the source of truth on any conflict.

## Rules

- Page sections live in `src/sections/` (Hero, Header, Badges, Projects, Skills, FAQs, Testimonials, Footer, Intro) and are composed in `src/app/page.tsx`.
- Reusable UI primitives live in `src/components/ui/`, following shadcn/ui conventions (`components.json`: style "new-york", Radix-based, class merging via `cn()` in `src/lib/utils.ts`).
- Path alias `@/*` maps to `src/*`.
- Content/data lives in `utils/data/*.js` (badges, personal info, skills) and is imported into section components rather than hardcoded inline.
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
