# 0017. Landing hero motion, portrait, and socials

**Date**: 2026-11-01
**Status**: Accepted

## Summary

This is the second touch to the landing hero that spec 0016 shipped static. The hero becomes a split layout, with the copy on the left and your real `eat-sleep-code.png` photo on the right. The photo zooms gently inside its frame as you scroll. The headline reveals word by word using CSS only, so the full message reads in under half a second and never waits for JavaScript. LinkedIn and GitHub sit beside the button, all five socials join the brand footer, and with reduced motion turned on everything renders still.

## Requirements

**User stories**:
- As a small business owner landing on `/`, I want to read the whole pitch at once, without waiting on an animation, so that I know right away whether you can help me.
- As that visitor, I want to see the person behind ED Solutions and reach their LinkedIn or GitHub, so that I can trust there is a real developer here.
- As a visitor who turned on reduced motion, I want the page to stay still, so that it does not make me feel unwell.

**Acceptance criteria**:
- **AC-1**: From `md` up the hero is a two column layout: copy on the left (7 of 12 columns), portrait on the right (5 of 12). At 375px the portrait sits full width below the copy. The headline, stance line, credibility line, and button label still come from `landingData`, and the page still has exactly one `h1`, whose text equals `landingData.hero.headline`.
- **AC-2**: On load, the headline words, the stance line, the credibility line, the button and socials row, and the portrait animate in with CSS only. Every one of them reaches its final state within 500ms of first paint. There is no 3 second delay and no "Click Me!" ribbon. The full text is in the server HTML, and it reads with JavaScript off.
- **AC-3**: The portrait is `src/assets/images/eat-sleep-code.png`, rendered with `next/image` (blur placeholder) inside a rounded frame with a token border, using alt text from `landingData.hero.portraitAlt`. As the page scrolls from 0 to 1000px, the image scales smoothly from 1 to 1.2 inside its frame (`overflow: hidden`). There is no layout shift and no horizontal scroll.
- **AC-4**: LinkedIn and GitHub show as round icon links in the same row as "Tell me about your project", after it. At 375px they wrap under the button. Each opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) with the accessible name "<Label> (opens in a new tab)". Each has at least a 44px target, uses token colors only, and shows the `focusRing`.
- **AC-5**: The brand footer shows all five socials (LinkedIn, GitHub, Codewars, MonkeyType, Facebook, in that order) as the same icon links, in a list labelled "Social links", under the email link. The `/personal` footer is unchanged.
- **AC-6**: From `md` up, a scroll hint ("Scroll" in `.brand-label` plus three chevrons that pulse in turn) sits centered at the bottom of the first viewport, inside the hero. It scrolls away with the page and never grows, moves, or zooms on idle. It is `aria-hidden` and takes no pointer events. Below `md` it is hidden, because the portrait peeking below the copy does that job.
- **AC-7**: On hover, the `ContactLink` button lifts slightly, on top of its existing fill swap and arrow slide. This applies everywhere `ContactLink` is used (the hero and the closing call to action).
- **AC-8**: With `prefers-reduced-motion: reduce`, everything renders in its final state from the first paint: no word reveal, no rise, no portrait zoom, no chevron pulse, and no lift or arrow slide on hover. The hover color change stays.
- **AC-9**: No regressions. The hero button still records `contact_click` with location `hero`. `/personal` (hero, footer, scroll indicator) looks and behaves as before. There is no horizontal scroll at desktop or 375px, in dark or light. Brand pages use token colors only. Social URLs live in one place (`brandData.socials`, built from `personalData`).
- **AC-10**: `npm run lint`, `npm test`, `npm run build` (with the leak check), and `npm run test:e2e` all pass.

## Decision

**Chosen**: a server rendered hero with a CSS only reveal, plus one small client component for the scroll zoom.

The hero stays a server component. The headline is split into word spans in JSX, and CSS keyframes run the reveal. Only `LandingPortrait` is client code, using `motion`'s `useScroll` for a zoom held inside the frame. The socials are a shared server component fed by `brandData.socials`.

**Implementation skills**: `framer-motion-animator` (`patricio0312rev/skills`, `.claude/skills/framer-motion-animator/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.claude/skills/tailwindcss-advanced-layouts/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`)

Picks made on your behalf (you delegated the remaining choices on 2026-11-01). Each one shows the pick, a one line why, and the runner up:

| Choice | Pick | Why | Runner up |
|---|---|---|---|
| Portrait image | `eat-sleep-code.png` | Your real photo, already in the repo; the dark shirt suits the dark page | A new front facing headshot (the build would wait on the file) |
| Placement | Right column, split layout | The headline stays the first read; same shape as `/personal` | A wide band below the copy |
| Hero links | Beside the button, same row | The button keeps priority, and the links sit next to it | Under the credibility line |
| Reveal | CSS only, words split in JSX | It never waits for hydration (the moment client JS takes over the page), stays a server component, and reduced motion is one media query | Reuse `useTextRevealAnimation` with a faster stagger |
| Zoom style | Scale 1 to 1.2 inside a fixed frame, driven by page scroll 0 to 1000px | No 200vh scroll runway, no overlap with the copy, no hydration jump (scroll 0 means scale 1) | `/personal`'s width growth to 240% inside a sticky 200vh runway |
| Footer row place | Under the email link, left column | It groups the ways to reach you | A row above the copyright line |
| Social icon colors | Token colors (`text-muted-foreground`, then `text-foreground` with a stronger border on hover) | Brand rule: token colors only | Platform brand colors on hover (breaks the brand rule) |
| Social click tracking | None in this feature | It keeps the links server rendered; feature 37 owns conversion tracking | `link_click` with a new `kind: "social"` |
| Scroll hint on phones | Hidden below `md` | A fixed or anchored hint can collide with the button on short phones | An anchored hint at all sizes |
| Button hover | Lift `-translate-y-0.5` with a transform transition, via `motion-safe:` | Pure CSS, matches the existing pill hover | `motion` `whileHover` scale (needs client code) |
| Image loading | `loading="eager"`, `placeholder="blur"`, `sizes="(min-width: 768px) 42vw, 100vw"` | Above the fold on desktop and right after the copy on phones | `preload` (Next 16 docs advise eager or `fetchPriority` instead) |

## Feature design

**Data model sketch**: no database. Two copy changes:
- `utils/data/landing-data.ts`, `hero` gains `portraitAlt: "Erskine Duenas from behind, wearing an eat sleep code shirt"` and `scrollHint: "Scroll"`.
- `utils/data/brand-data.ts` gains `socials`, built from `personalData` (import `./personal-data`), in this order:
  `{ platform: "linkedin", label: "LinkedIn", href: personalData.linkedIn, hero: true }`, `{ platform: "github", label: "GitHub", href: personalData.github, hero: true }`, `{ platform: "codewars", label: "Codewars", href: personalData.codewars }`, `{ platform: "monkeytype", label: "MonkeyType", href: personalData.monkeyType }`, `{ platform: "facebook", label: "Facebook", href: personalData.facebook }`.

**Components**:

| File | Kind | What it does |
|---|---|---|
| `src/sections/LandingHero.tsx` (changed) | Server | `section#pitch` gets `relative`. The grid is `md:grid-cols-12`. The copy column (`md:col-span-7`) holds the `h1`, whose words are `headline.split(" ")`, each a `<span className="brand-reveal-word" style={{ "--i": index }}>`, with literal spaces between them so the text reads normally. The stance, the credibility, and a row (`flex flex-wrap items-center gap-4`) with `ContactLink location="hero"` then the hero socials each get `brand-rise`. The `md:col-span-5` column holds `LandingPortrait`. Then the scroll hint. Headline size steps down to `text-5xl md:text-6xl lg:text-7xl` to fit 7 columns. |
| `src/components/brand/LandingPortrait.tsx` (new) | Client | A frame (`relative overflow-hidden rounded-lg border border-border brand-rise`, `aspect-[4/5]` below `md`, `md:h-[min(70svh,640px)]` from `md`) holding a `motion.div` whose `style.scale` is `useTransform(useScroll().scrollY, [0, 1000], [1, 1.2])` (clamped). When `useReducedMotion()` is true, it renders scale 1 with no transform. Inside is `next/image` with `fill`, `object-cover`, `object-[50%_35%]`, and the loading props from the Decision table. |
| `src/components/brand/SocialIconLink.tsx` (new) | Server | A real `<a>` with `href`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="{label} (opens in a new tab)"`, `inline-flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/60` plus `focusRing`. The icon (size 20, `aria-hidden`) is mapped by platform: `BiLogoLinkedin`, `IoLogoGithub`, `SiCodewars`, `SiMonkeytype`, `FaFacebook` (already used by `/personal`). No entrance delay. |
| `src/sections/Footer.tsx` (changed) | Client (as now) | Brand variant only: under the email link, a `<ul aria-label="Social links" className="mt-6 flex flex-wrap gap-3">` holding the five `SocialIconLink`s. The personal variant is untouched. |
| `src/components/brand/ContactLink.tsx` (changed) | Client (as now) | Adds `transition-transform motion-safe:hover:-translate-y-0.5`. The arrow slide gets `motion-reduce:` overrides, so it does not slide under reduced motion. |
| `src/app/globals.css` (changed) | CSS | Under `@layer components`, see below. |

**CSS (in `globals.css`, `@layer components`)**:
- `@keyframes brand-rise { from { opacity: 0; transform: translateY(0.35em) } to { opacity: 1; transform: none } }`
- `.brand-reveal-word { display: inline-block; animation: brand-rise 300ms ease-out both; animation-delay: min(calc(var(--i) * 20ms), 150ms); }` (the last word ends by 450ms whatever the headline length)
- `.brand-rise { animation: brand-rise 300ms ease-out 150ms both; }` (ends at 450ms)
- `.brand-scroll-chevron { animation: brand-pulse 1.5s ease-in-out infinite; animation-delay: calc(var(--i) * 300ms); }` with `@keyframes brand-pulse { 0%, 100% { opacity: 0 } 50% { opacity: 1 } }`
- `@media (prefers-reduced-motion: reduce) { .brand-reveal-word, .brand-rise, .brand-scroll-chevron { animation: none; } }` (the chevrons then show at full opacity)

**Scroll hint markup**: `<div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[calc(100svh-5rem)] hidden -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground md:flex">`, holding the `brand-label` text from `landingData.hero.scrollHint` and three chevron SVGs with `brand-scroll-chevron` and `--i` 0, 1, 2. It is anchored to the first viewport inside the `relative` hero, so it scrolls away with no observers and no timers.

**API surface**: none. No routes, actions, or env vars.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Render hero | Headline words | `landingData.hero.headline` split on spaces |
| Render hero | Stance, credibility, button label | `landingData.hero.stance`, `.credibility`, `landingData.ctaLabel` |
| Render hero | Portrait image and its blur placeholder | Static import of `src/assets/images/eat-sleep-code.png` |
| Render hero | Portrait alt text | `landingData.hero.portraitAlt` |
| Render hero | Hero social links | `brandData.socials` where `hero: true` |
| Render hero | Scroll hint label | `landingData.hero.scrollHint` |
| Render footer | Five social links | `brandData.socials`, all, in order |
| Social link | URL, label, icon | `href` and `label` from `brandData.socials` (URLs from `personalData`); icon from the platform map in `SocialIconLink` |
| Scroll | Portrait scale | `useScroll().scrollY` mapped `[0, 1000] → [1, 1.2]` |
| Any motion | Whether to animate | `prefers-reduced-motion` (a CSS media query, plus `useReducedMotion()` in `LandingPortrait`) |
| Reveal timing | Word delay | `--i` (the word index) set inline, capped at 150ms in CSS |

**Key invariants**:
- The hero text is never hidden behind JavaScript. With JS off, the CSS reveal still ends in the final state.
- Every animation finishes by 500ms after first paint, except the looping chevrons and the scroll driven zoom.
- The zoom never changes layout. It is a transform inside an `overflow: hidden` frame.
- Brand pages use no `stone-*`, `white`, `black`, `neon-*`, or platform hex colors.
- No section id from `PERSONAL_SECTION_IDS` is added to `/`.
- Public code imports nothing from `src/studio/`.

**Security model**: public page, no data in, no secrets. External links use `rel="noopener noreferrer"`.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: at desktop, `/` shows the copy and portrait side by side; 600ms after load every `.brand-reveal-word` has computed opacity 1; LinkedIn and GitHub sit beside the button; verifies **AC-1**, **AC-2**, **AC-4**
- Zoom: after scrolling 600px, the portrait's inner transform reads a scale above 1; at the top it is 1; verifies **AC-3**
- Reduced motion: with `page.emulateMedia({ reducedMotion: "reduce" })`, the words report `animation-name: none`, and the portrait has no transform after a scroll; verifies **AC-8**
- No JS: with JavaScript off, the `h1` text equals the headline and is visible; verifies **AC-2**
- Footer: on `/` and `/products`, five links with the right names and hrefs, each with `target="_blank"`; `/personal` footer unchanged; verifies **AC-5**, **AC-9**
- Phone: at 375px, the hint is hidden, the portrait sits below the copy, and there is no horizontal scroll; verifies **AC-1**, **AC-6**, **AC-9**
- Regression: clicking the hero button records `contact_click` `hero` (the existing `ContactLink.test.tsx`); verifies **AC-9**

## Build plan

Tracer Bullet: the first slice puts the new layout live end to end, with the real image and links. Each later slice layers motion on a hero that already works.

1. Thin thread: add `portraitAlt`, `scrollHint`, and `brandData.socials`; add `SocialIconLink`; rework `LandingHero` into the split layout with a static `LandingPortrait` (no zoom yet) and the two hero socials beside the button, satisfies **AC-1**, **AC-3**, **AC-4**
2. Reveal: word spans plus the `brand-reveal-word`, `brand-rise`, and reduced motion CSS, satisfies **AC-2**, **AC-8**
3. Zoom: `useScroll` scale in `LandingPortrait`, plus the `useReducedMotion` guard, satisfies **AC-3**, **AC-8**
4. Scroll hint: anchored markup and the chevron pulse, hidden below `md`, satisfies **AC-6**, **AC-8**
5. Footer row: five socials in the brand footer variant, satisfies **AC-5**, **AC-9**
6. Button hover: the `ContactLink` lift and the reduced motion overrides, satisfies **AC-7**, **AC-8**
7. Checks: `LandingHero.test.tsx` (h1 text, word spans, two hero socials with name, href, target, and rel); a brand footer test (five socials in order); new `e2e/landing.spec.ts` cases from *Critical test scenarios*; a `/personal` crossover still green; lint, build, and a browser pass at desktop and 375px in both themes, satisfies **AC-9**, **AC-10**

## Consequences

**Positive**:
- The full pitch shows in under half a second with no JavaScript in the path, which helps both first impressions and the main paint.
- One social list feeds the hero and the footer, so a changed URL is a one line edit.
- Reduced motion is handled in one CSS block plus one hook, the first reduced motion support on the site.

**Negative / tradeoffs**:
- The photo shows your back, not your face. It builds less trust than a front facing headshot, and the deferred "real headshot" item stays open.
- The zoom is gentler than `/personal`'s break out zoom, so the two pages now animate differently.
- The PNG is large (5184x3456). `next/image` resizes it, but the first optimizer hit on a cold cache is slow.
- Hiding the scroll hint on phones means phones get no explicit hint.
- Social clicks go untracked until feature 37.

**Neutral**:
- `useTextRevealAnimation` and `SocialLinkButton` stay as they are, used only by `/personal`.
- `ContactLink`'s hover lift also reaches the closing call to action.

## Follow-up

- [ ] Feature 37 (inquiry conversion tracking): decide whether social clicks count, for example `link_click` with `kind: "social"` and the platform.
- [ ] Deferred "real headshot": when a front facing photo exists, swap the static import in `LandingPortrait` and update `portraitAlt`. That is a one file change.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
