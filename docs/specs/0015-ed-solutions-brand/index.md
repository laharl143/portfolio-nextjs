# 0015. ED Solutions brand for the business pages

**Date**: 2026-11-01
**Status**: Accepted

Decision history: [rationale.md](rationale.md)

## Summary

ED Solutions gets its own look: a dark slate, high contrast style taken from the WHOOP app's mood (WHOOP is a style reference only, nothing of theirs is copied), an "ED SOLUTIONS" wordmark set in wide Archivo, one electric blue accent, and a new favicon and share card. The brand applies to the business pages, `/products` and `/contact` now, and the future `/` landing page (feature 33) is built on it. `/personal` and the private studio stay exactly as they are, down to their favicon, site name, and theme default. In practice the business pages move into their own route group (a folder in parentheses that groups pages without changing their URLs), and that group carries the brand theme, icons, and metadata.

## Requirements

**User stories**:
- As a small business owner opening `/products` or `/contact`, I want a page that looks like a confident, modern business so I trust it with my project.
- As a small business owner who gets a shared link, I want the preview card to say ED Solutions and what it does so I know what I'm clicking.
- As a recruiter on `/personal`, I want the portfolio exactly as it is today so nothing about the employer page changes.
- As Erskine, I want the brand defined once as tokens (named color and type values) and components so the landing page (feature 33) and later pages build on it without inventing a look.

**Acceptance criteria**:
- **AC-1**: A `.brand` scope in `src/app/globals.css` defines the palette in the Brand tokens table below for light and dark. Inside it, `foreground`, `muted-foreground`, and `signal` text each reach at least 4.5:1 contrast on both `background` and `card`, in both themes.
- **AC-2**: `/products` and `/contact` render inside the brand scope. Dark shows the slate gradient surface and light shows the derived light surface, including overscroll and areas below short content. The header shows only the `ED SOLUTIONS` wordmark (accessible name "ED Solutions") where "Erskine Duenas", the `ED` badge, and the title toggle were. The labels named in *Page body conversion* use the brand label style (expanded Archivo, uppercase, wide tracking). The footer uses brand tokens, and its buttons use the pill variants. This holds at desktop and 375px in both themes, with no horizontal scroll.
- **AC-2b**: Inside the brand subtree (the `(brand)` pages plus the brand variants of `Header` and `Footer`), no neutral or accent color class remains: no `stone-*`, `white`, or `black` color utility (except the header's `mix-blend-difference` bar), and no `neon-*` or `red-orange-*`. Status colors (the green product status, the red form errors, the footer pulse dot) stay as they are.
- **AC-3**: A visitor with no saved theme sees `/products` and `/contact` in dark and `/personal` in light (today's default). After the visitor picks a theme with the toggle on any page, every page uses that pick, because there is one shared saved choice. A full page load shows no flash of the wrong theme. A client navigation between a brand page and `/personal` ends on the right theme on the first try, and a flash of at most one frame on that crossover is accepted. A stale saved value of `system` is treated as no choice.
- **AC-4**: `/products` renders `<title>Products | ED Solutions</title>` and `/contact` renders `<title>Contact | ED Solutions</title>`. On both, `og:site_name` is `ED Solutions` and `og:title` matches the title. Descriptions and canonicals are unchanged.
- **AC-5**: The `og:image` and `twitter:image` URLs on `/products` and `/contact` (read from the tags, never hardcoded) each return a 1200x630 PNG brand card. Each card shows the `ED SOLUTIONS` wordmark, that page's `cardHeadline`, the brand tagline, and the domain on the dark slate surface with a signal blue accent bar. Its alt text is `ED Solutions, <cardHeadline>`.
- **AC-6**: The `<head>` of `/products` and `/contact` links exactly the brand icons: `/icons/ed-solutions.svg` (type `image/svg+xml`) and the 180x180 apple touch icon `/icons/ed-solutions-180.png`. It does not link the old icon. Both files return 200, and the SVG mark stays legible at 16px. Tests assert on the rendered `<link rel="icon">` and `<link rel="apple-touch-icon">` hrefs, which Next does not hash for `metadata.icons`.
- **AC-7**: `/personal` is frozen. Its title, description, canonical, `og:site_name` (`Erskine Duenas`), share card, JSON-LD, `/profile-image`, and favicon (the old icon, now linked from `/icons/erskine-duenas.ico`) are unchanged. `/favicon.ico` still returns the old icon, byte for byte. Its look matches a baseline captured before the build at desktop and 375px in both themes. No `.brand` element appears in its DOM.
- **AC-8**: The studio is frozen. Studio pages link only the old icon, keep today's look and theme default, and contain no `.brand` element.
- **AC-9**: Not found responses look and behave as today, both for a `notFound()` call inside `(site)` and for an unmatched URL such as `/does-not-exist`. That means the same status, look, theme default, and old icon. A page rendered by `(site)/not-found.tsx` has a working theme toggle where it has one today.
- **AC-10**: `npm run lint`, `npm test`, `npm run build` (including the studio leak check), and `npm run test:e2e` pass. New tests cover the brand metadata, the icons, the theme defaults, and the crossover. No existing test asserts the old brand page titles, so none needs changing (checked 2026-11-01).

## Decision

**Chosen option**: Option 2: a scoped brand theme in its own route group.

The business pages move into `src/app/(site)/(brand)/`, whose layout wraps them in a `.brand` token scope, provides the theme with a dark default, and sets the ED Solutions title template, Open Graph base, and icons. `/personal`, the not found page, and the studio keep today's tokens, theme default, and old icon.

**Choices made by delegation** (2026-11-01: the engineer picked the recommended option for the accent and every later dimension): electric blue accent; exact token values; tagline copy; favicon form; brand card layout; Header and Footer variants instead of forks; pill Button variants; the reference screenshots are not committed; no References section.

**Implementation skills**: `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.claude/skills/tailwindcss-advanced-layouts/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Style reference (from the WHOOP screenshots, as mood only)

- Surfaces: a near black base rising to deep slate (a soft vertical gradient). Cards sit one step lighter, with large rounded corners (16px) and no hard borders.
- Type: small uppercase labels with wide tracking, big bold numerals and headlines, and sentence case body text in muted gray.
- Buttons: pill shaped. The primary is a solid light fill with dark uppercase tracked text, and the secondary is an outline.
- Color: monochrome, plus one signal color used sparingly for links, focus, and highlights, never for large fills.
- Never copy WHOOP's logo, wordmark, letterforms, product names, icons, proprietary fonts, or exact colors.

### Brand tokens

Values are HSL triplets in the shadcn style the project already uses (`hsl(var(--name))`). Light lives on `.brand` and dark on `.dark .brand`, because next-themes puts `dark` on `<html>`.

| Token | Light (`.brand`) | Dark (`.dark .brand`) |
|---|---|---|
| `--background` | `210 20% 97%` (#F5F7F9) | `213 33% 6%` (#0A0E13) |
| `--foreground` | `213 30% 9%` (#10161D) | `210 20% 97%` (#F5F7F9) |
| `--card` | `0 0% 100%` | `211 19% 14%` (#1D242B) |
| `--card-foreground` | `213 30% 9%` | `210 20% 97%` |
| `--popover` / `--popover-foreground` | same as card | same as card |
| `--primary` | `213 30% 9%` | `0 0% 100%` |
| `--primary-foreground` | `0 0% 100%` | `213 30% 9%` |
| `--secondary` / `--muted` / `--accent` | `210 16% 92%` | `211 16% 19%` |
| `--secondary-foreground` / `--accent-foreground` | `213 30% 9%` | `210 20% 97%` |
| `--muted-foreground` | `213 10% 38%` (#575F69) | `213 9% 66%` (#A4A9B0) |
| `--border` / `--input` | `210 14% 85%` | `211 14% 22%` |
| `--signal` (new) | `210 100% 40%` (#0066CC) | `205 100% 50%` (#0096FF, the existing `neon-light`) |
| `--ring` | same as `--signal` | same as `--signal` |
| `--surface-top` (new) | `0 0% 100%` | `211 22% 16%` (#20272F) |
| `--surface-bottom` (new) | `210 18% 93%` | `213 33% 6%` |
| `--radius` | `1rem` | `1rem` |

`--destructive` and the chart tokens inherit today's values. In `tailwind.config.ts`, add `signal: 'hsl(var(--signal))'` to `colors`.

### Brand utilities (in `globals.css`, `@layer components`)

- `.brand-surface`: `background-image: linear-gradient(to bottom, hsl(var(--surface-top)), hsl(var(--surface-bottom)))`, plus `background-color: hsl(var(--background))` as the fallback.
- `.brand-label`: uppercase, `letter-spacing: 0.16em`, `font-weight: 600`, `font-stretch: 125%`, `font-size: 0.75rem` (0.875rem from `md`).
- `.brand-heading`: `font-weight: 700`, `font-stretch: 112%`, `letter-spacing: -0.01em`.
- `body:has(> .brand)`: `background-color: hsl(var(--surface-bottom))`. The `<body>` lives in the parent `(site)` layout with stone colors, so this keeps overscroll and short pages on the brand surface. `:has` is supported in every current browser. Where it isn't, the stone body shows only in overscroll, which is acceptable.

### Page body conversion (brand subtree only)

`src/sections/Products.tsx` and `src/components/ContactForm.tsx` are used only by the brand pages, so they convert directly with no variant. In `Header` and `Footer`, the same mapping applies only when `variant === "brand"`.

| Today | Brand token class |
|---|---|
| `text-stone-900`, `dark:text-stone-100`, `dark:text-white`, solid `text-white` on a dark fill | `text-foreground` |
| `text-stone-500` / `600` / `700`, `dark:text-stone-300` / `400`, `text-stone-200` | `text-muted-foreground` |
| `border-stone-400` / `800`, `dark:border-stone-600` | `border-border` |
| Form fields `bg-white`, `dark:bg-stone-950`; the header menu button `bg-stone-200 dark:bg-stone-900`; the menu overlay `bg-stone-900` | `bg-card` |
| Small surfaces `bg-stone-300` / `400` / `800` (badges, chips, hover fills) | `bg-muted` |
| Solid action fills `bg-stone-900`, `dark:bg-stone-100` with their text | `bg-primary text-primary-foreground` |
| `ring-red-orange-500`, `focus-visible:ring-red-orange-500` | `ring-ring`, `focus-visible:ring-ring` |
| `hover:bg-neon-500`, `bg-neon-light-500`, `hover:text-neon-light-500` | `hover:bg-signal`, `bg-signal`, `hover:text-signal` |
| Status colors (`green-*` product status, `red-700` / `red-400` errors, the footer's `green-400` dot) | unchanged |

Labels that take `.brand-label`: the product status badge and each product's section label in `Products.tsx`, and the form field labels in `ContactForm.tsx`. Headings in both take `.brand-heading`. The Turnstile widget is an iframe, so it doesn't need tokens. Its theme follows its existing setting.

### Type

Archivo stays the only font. `src/lib/fonts.ts` adds `axes: ["wdth"]` so the width axis (62 to 125) loads. The default width stays 100, so `/personal` and the studio render as today. Brand styles reach the wide cut through `font-stretch`.

### Wordmark

`src/components/brand/Wordmark.tsx` is a server component that renders the text `ED SOLUTIONS` from `brandData.name` (uppercased), with `aria-label` set to the name. It uses Archivo at `font-weight: 300`, `font-stretch: 125%`, `letter-spacing: 0.24em`, and the header sizes in use today (`text-xl md:text-3xl lg:text-4xl`), with an optional `className` merged by `twMerge`. It has no size prop until a second size is needed, and it renders no image file.

### Favicon

- `public/icons/ed-solutions.svg`: a 32x32 viewBox with a `#0A0E13` rounded square (radius 7). On it, "ED" is drawn as white geometric strokes (stroke width 3, square caps, no `<text>` and no font). The E is three bars and a stem, and the D is a stem with a half round bowl. This keeps it legible at 16px.
- `public/icons/ed-solutions-180.png`: the same mark rasterized once at 180x180 and committed. Make it with a one off `node` command that uses `sharp` (`sharp(svg).resize(180).png().toFile(...)`), run from the scratch area and not committed. Commit only the PNG.
- `public/icons/erskine-duenas.ico` and `public/favicon.ico`: two byte identical copies of today's `src/app/favicon.ico`. Then delete `src/app/favicon.ico`. Next only allows `favicon.ico` at the top of `app/`, and from there it would link on every page. The `public/` copy keeps `/favicon.ico` answering for crawlers and tools that ask for it without a link tag.

### Brand data

`utils/data/brand-data.ts` exports `brandData = { name: "ED Solutions", tagline: "Connected systems for small businesses" }`. It is public content only, per the data in `utils/data/` rule.

### Share card

`src/lib/og-card.tsx` adds `renderBrandCard(headline: string)` beside `renderShareCard`, which stays unchanged for `/personal`. The card is 1200x630 (`OG_SIZE`) and uses Next's bundled default font, as spec 0009 does. It has a vertical gradient from `#20272F` to `#0A0E13` and 72px by 80px padding. Top left is the wordmark text (`brandData.name` uppercased, 40px, weight 300, `letterSpacing` 10px, `#F5F7F9`) with a 96x8 `#0096FF` bar under it. Next is the headline (80px, weight 700, `#FFFFFF`), then the tagline (32px, uppercase, `letterSpacing` 4px, `#A4A9B0`). The domain (28px, `#A4A9B0`) sits at the bottom.

### Route structure and layouts

| File | Change |
|---|---|
| `src/components/AppProviders.tsx` | Takes `defaultTheme: "light" \| "dark"` (required), passed to `ThemeProvider`. Everything else stays. |
| `src/app/(site)/layout.tsx` | Keeps `<html>`, `<body>` (today's classes), `Analytics`, and `metadataBase`. Drops `AppProviders`, because a nested next-themes provider defers to an outer one. Title template becomes `%s \| ${PERSONAL_SITE_NAME}`, `openGraph` becomes `personalOpenGraphBase`, and it adds `icons: { icon: [{ url: "/icons/erskine-duenas.ico", type: "image/x-icon", sizes: "any" }] }`. |
| `src/app/(site)/personal/layout.tsx` (new) | `<AppProviders defaultTheme="light">{children}</AppProviders>` |
| `src/app/(site)/not-found.tsx` | Wraps its content in `<AppProviders defaultTheme="light">`. |
| `src/app/(site)/(brand)/layout.tsx` (new) | `<AppProviders defaultTheme="dark"><div className="brand brand-surface min-h-screen bg-background text-foreground">{children}</div></AppProviders>`. Metadata sets `title: { default: SITE_NAME, template: `%s \| ${SITE_NAME}` }` (the default stops a page that forgets its title from inheriting the portfolio title), `openGraph: openGraphBase`, and `icons: { icon: [{ url: "/icons/ed-solutions.svg", type: "image/svg+xml" }], apple: [{ url: "/icons/ed-solutions-180.png", sizes: "180x180" }] }`. |
| `src/app/(site)/products/` → `src/app/(site)/(brand)/products/` | Moved with its `opengraph-image.tsx`. The page renders `<Header variant="brand" />` and `<Footer variant="brand" />`. |
| `src/app/(site)/contact/` → `src/app/(site)/(brand)/contact/` | The same. |
| `src/app/(studio)/layout.tsx` | Passes `defaultTheme="light"` and adds the same `icons` entry as `(site)`. |
| `src/lib/site.ts` | `SITE_NAME = "ED Solutions"`. Adds `PERSONAL_SITE_NAME = "Erskine Duenas"` and `personalOpenGraphBase = { ...openGraphBase, siteName: PERSONAL_SITE_NAME }`. |
| `src/app/(site)/personal/page.tsx` | Spreads `personalOpenGraphBase` instead of `openGraphBase`. Nothing else changes. |
| `products/opengraph-image.tsx`, `contact/opengraph-image.tsx` | Call `renderBrandCard`, with alt `` `${brandData.name}, ${seo.<page>.cardHeadline}` ``. |

### Component variants

- `Header` gets `variant?: "personal" | "brand"`, defaulting to `"personal"` so `/personal` is untouched. `brand` swaps the name, badge, and `TitleToggle` for `<Wordmark />`. The wordmark links to `/`, which redirects to `/personal` until feature 33. Every other color class follows the *Page body conversion* table. The `mix-blend-difference` bar (its `text-white` and `border-white`), the nav items, and the theme toggle stay. The blend bar must keep at least 3:1 against the content under it at the top of the page and while scrolling over cards in both themes. If it doesn't, the brand variant drops `mix-blend-difference` and uses `text-foreground` on a `bg-background/70 backdrop-blur-md` bar.
- `Footer` gets the same `variant` prop. `brand` swaps `bg-stone-900 text-white` for `bg-card text-card-foreground` (`text-white/30` becomes `text-muted-foreground`), and its Button variants for the pill ones. Copy stays unchanged (see Follow-up).
- Portals: nothing in the brand subtree renders through a portal today (the shadcn `alert-dialog` is used only in the studio). Any future portal on a brand page must render inside the `.brand` wrapper (for example with a `container` prop), or it loses the tokens.
- `Button` adds `"pill"` and `"pill-outline"` to `variant`. `pill`: `rounded-full bg-primary text-primary-foreground border-primary tracking-[0.16em] hover:bg-transparent hover:text-foreground`. `pill-outline`: `rounded-full border-foreground/60 text-foreground hover:bg-foreground hover:text-background`. Both keep the base height and uppercase.

**Data model sketch**: none. This feature adds no tables, columns, or stored data. The only state is next-themes' existing `theme` key in local storage, which stays shared across pages.

**API surface** (routes and generated files, no new endpoints):
| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/products`, `/contact` | GET | none | brand page HTML, brand metadata, brand icon links | public | none new |
| `/products/opengraph-image…`, `/contact/opengraph-image…` (hashed by Next) | GET | none | 1200x630 PNG brand card | public | none (static at build) |
| `/icons/ed-solutions.svg`, `/icons/ed-solutions-180.png`, `/icons/erskine-duenas.ico` | GET | none | static files | public | 404 if a file is missing |
| `/personal`, studio, not found | GET | none | unchanged | unchanged | unchanged |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Header and card wordmark | `ED SOLUTIONS` text | `brandData.name`, uppercased |
| Brand card | tagline | `brandData.tagline` |
| Brand card | headline | `seo.products.cardHeadline` / `seo.contact.cardHeadline` (existing) |
| Brand card | domain | `new URL(SITE_URL).host` (existing in `og-card.tsx`) |
| Brand card alt | alt text | `brandData.name` + `cardHeadline` |
| Brand page titles | `Products \| ED Solutions` | `seo.<page>.title` + the `(brand)` layout template from `SITE_NAME` |
| Brand page `og:site_name` | `ED Solutions` | `openGraphBase.siteName` from `SITE_NAME` |
| `/personal` `og:site_name` | `Erskine Duenas` | `personalOpenGraphBase` from `PERSONAL_SITE_NAME` |
| Theme on first visit | dark or light | the `defaultTheme` prop of the group's `AppProviders` |
| Theme after a pick | the picked theme | the next-themes `theme` key in local storage (shared) |
| Every brand color | token value | the Brand tokens table, `.brand` and `.dark .brand` |
| Favicon per page | icon links | `metadata.icons` in the `(site)`, `(brand)`, and `(studio)` layouts (the deeper layout's `icons` replaces the parent's) |

**Key invariants**:
- `.brand` appears only in `src/app/(site)/(brand)/layout.tsx`. Public code outside the group, and all of the studio, never uses `.brand`, `brand-*` utilities, the `signal` color, `Wordmark`, or the pill variants.
- `Header` and `Footer` default to `"personal"`. Only pages inside `(brand)` pass `"brand"`.
- Exactly one `ThemeProvider` wraps any page, all with the same storage key (the default).
- `renderShareCard` and `/profile-image` stay byte for byte the same.
- No WHOOP asset, name, or exact color appears anywhere in the repo.

**Security model**: no change. Everything here is public and static. Nothing touches the studio gate, the inquiry write path, or any secret. The leak check (spec 0003) still runs in the build.

**Configuration required**: none. There are no new environment variables or credentials.

**Critical test scenarios**:
- Happy path: open `/contact` with no saved theme. It is dark, shows the slate gradient, the `ED SOLUTIONS` wordmark, title `Contact | ED Solutions`, the brand icon links, and an `og:image` that returns the brand card. Verifies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
- Theme crossover: on `/products`, pick light, then client navigate to `/personal` and on to `/contact`. All three are light. Clear storage, load `/personal` (light), then `/products` (dark). Verifies **AC-3**.
- Freeze: compare `/personal` against the baseline screenshots at desktop and 375px in both themes, and check its head (title, site name, old icon, card URL resolving to the unchanged card) and the absence of `.brand`. Do the same for a studio page. Verifies **AC-7**, **AC-8**, **AC-9**.
- Contrast: compute the ratios from the token values for each text token on `background` and `card` in both themes. Each must be at least 4.5:1. Verifies **AC-1**.

## Build plan

Tracer Bullet: the first slices put one thin thread through every layer (routing, theme, tokens, components, metadata, icons, card) before thickening and proving the freeze.

1. Capture baseline screenshots of `/personal` and one studio page at desktop and 375px in both themes, before any change, saved under the scratch area (not committed). Satisfies **AC-7**, **AC-8**.
2. Route and theme plumbing: the `AppProviders` `defaultTheme` prop; move the provider out of `(site)/layout.tsx` into `personal/layout.tsx`, `not-found.tsx`, and the new `(brand)/layout.tsx`; move `products/` and `contact/` into `(brand)/`; pass the theme in the studio layout. Confirm URLs and the dark and light defaults. Satisfies **AC-3**, **AC-9**.
3. Tokens and type: the `.brand` and `.dark .brand` blocks, the `brand-*` utilities, the `signal` color in Tailwind, and `axes: ["wdth"]` in `fonts.ts`. The `(brand)` wrapper gets `brand brand-surface`. Satisfies **AC-1**, **AC-2**.
4. Identity components: `brand-data.ts`, `Wordmark`, the `Header` and `Footer` `variant` props, the `Button` pill variants, and the `"brand"` variant on the two brand pages. Satisfies **AC-2**.
4b. Page body conversion: apply the mapping table to `Products.tsx` and `ContactForm.tsx`, and to the brand branches of `Header` and `Footer`. Add `.brand-label` and `.brand-heading` where listed, then grep the brand subtree for leftover neutral and accent classes. Satisfies **AC-2**, **AC-2b**.
5. Metadata: `SITE_NAME`, `PERSONAL_SITE_NAME`, `personalOpenGraphBase`, the title templates in `(site)` and `(brand)`, and `/personal` switched to `personalOpenGraphBase`. Satisfies **AC-4**, **AC-7**.
6. Icons: move the old icon to `public/icons/erskine-duenas.ico` and delete `src/app/favicon.ico`; author `ed-solutions.svg` and rasterize `ed-solutions-180.png`; set `metadata.icons` in the `(site)`, `(brand)`, and `(studio)` layouts. Satisfies **AC-6**, **AC-7**, **AC-8**.
7. Share card: `renderBrandCard` in `og-card.tsx`, wired into both brand `opengraph-image.tsx` files with the new alt. Satisfies **AC-5**.
8. Tests: add a unit test for the metadata values (titles, site names, icons), and e2e checks for the theme defaults, the first soft navigation crossover with no saved theme, the icon links, `/favicon.ico`, and `/does-not-exist`. Satisfies **AC-3**, **AC-4**, **AC-6**, **AC-7**, **AC-9**, **AC-10**.
9. Checks and browser pass: lint, tests, build (with the leak check), e2e, then a browser pass at desktop and 375px in both themes covering every critical test scenario, the header blend contrast, and the baseline comparison. Satisfies **AC-1** through **AC-10**, including **AC-2b**.

## Consequences

**Positive**:
- One token scope defines the brand, so feature 33 builds `/` by dropping its page into `(brand)/` and inherits theme, icons, metadata, and look.
- `/personal` and the studio are protected by structure (they sit outside the group), not by discipline.
- No new font, dependency, or service. The width axis reuses the Archivo file already loaded.

**Negative / tradeoffs**:
- The site now has two looks to maintain until `/personal` is ever rebranded, and `Header` and `Footer` carry a variant branch.
- Three providers instead of one: any new page directly under `(site)/` outside `personal/` and `(brand)/` must wrap itself in `AppProviders`, or the theme toggle breaks there. The provider also remounts when a visitor crosses between groups, which risks a one frame theme flash. A single provider in `(site)` with a path based default was weighed and rejected, because next-themes reads `defaultTheme` only on mount, so it has the same crossover issue and weaker isolation.
- `Products.tsx` and `ContactForm.tsx` move to token classes, which is a one way change: they now only look right inside `.brand`.
- The wordmark on brand pages links to `/`, which still lands on `/personal` until feature 33 ships.
- The Archivo download grows a little, because the variable file now carries the width axis for every page.
- The brand footer still says "Seeking Full Time Employment Opportunities" and keeps its `/personal` nav links, which reads off message on business pages until feature 33 decides the brand nav and footer copy.

**Neutral**:
- `products/` and `contact/` move folders, while their URLs, canonicals, and sitemap entries stay the same.
- Specs 0009 and 0014 still hold. Only the brand pages' site name, title suffix, and card design change.

## Follow-up

- [ ] Feature 33 (landing page) owns the brand nav and footer copy: replace the job seeking line and the `/personal` section links on brand pages, and point the wordmark at the live `/`.
- [ ] Review the delegated tagline "Connected systems for small businesses" against the hero copy decided for feature 34 before feature 33 ships.
- [ ] `/sync`: root `AGENTS.md` says other public routes live in `src/app/(site)/<route>/page.tsx`. Business pages now live in `src/app/(site)/(brand)/<route>/`, and the rule for pages outside both groups wrapping themselves in `AppProviders` needs a line too.
- [ ] Scope done line for feature 32 says "applied to the landing page shell". By the engineer's choice it now reads as applied to the brand pages (`/products`, `/contact`) and the `(brand)` layout that `/` will use.
