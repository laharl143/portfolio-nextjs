# 0016. ED Solutions landing page at `/`

**Date**: 2026-11-01
**Status**: Accepted

Decision history: [rationale.md](rationale.md)

## Summary

`/` stops redirecting to `/personal` and becomes the ED Solutions landing page for small business owners. It lives in the `(brand)` route group, so it gets the spec 0015 brand, dark default, and icons without new plumbing. This feature builds the page's frame: the route, metadata, share card, structured data (machine readable facts for search engines), brand navigation and footer, and a forwarder for old `/#section` links. It also builds the sections no other feature owns: a static hero, "What I build", a products teaser, and a closing call to action. Features 34, 38, 39, and 40 later add or refine their own sections in reserved slots, so every release of the page is complete and nothing is a placeholder.

## Requirements

**User stories**:
- As a small business owner landing on the domain, I want to see in a few seconds what ED Solutions builds and how it helps a business like mine, so I decide whether to reach out.
- As a small business owner ready to talk, I want an obvious "Tell me about your project" link at the top and at the bottom, so I never hunt for the next step.
- As a visitor on `/products` or `/contact`, I want the header and footer links to bring me back to the landing page sections, so the business pages feel like one site.
- As a recruiter with an old `/#projects` link, I want to still reach the portfolio section, so links shared before the move keep working.
- As a recruiter on the landing page, I want a quiet way to reach `/personal`, so the employer story is one click away.
- As Erskine, I want the landing page copy in one data file and the later section features to slot in without reworking the page, so the sales slice ships one complete piece at a time.

**Acceptance criteria**:
- **AC-1**: `GET /` answers 200 with the landing page, not a redirect. `next.config.mjs` has no redirect for `/`. The page renders inside the `(brand)` layout's `.brand` wrapper, and a visitor with no saved theme sees it in dark.
- **AC-2**: The page renders these sections in this order inside `<main>`: `#pitch` (hero), `#services`, `#ecosystem` (products teaser), `#start` (closing call to action), followed by the brand footer. It has exactly one `<h1>` (the hero headline), and each other section has an `<h2>`. None of the ids `hero`, `badges`, `skills`, `projects`, `faqs`, or `contact` appear anywhere in the DOM of `/`.
- **AC-3**: The hero shows, as static text with no animation, the headline "I build the connected systems small businesses run on.", the stance line "I don't build marketing sites. I build the systems behind them.", and the credibility line "Application Developer at IBM by day, building for small businesses." Under them is a link (role `link`) named "Tell me about your project" that goes to `/contact` and records `contact_click` with location `hero`.
- **AC-4**: `#services` shows the label "What I build", its heading, and exactly three cards, each with a title and a one sentence body, all from `landingData.services` in `utils/data/landing-data.ts`.
- **AC-5**: `#ecosystem` shows its label, heading, and intro from `landingData.ecosystem`. It lists each product in `utils/data/products-data.ts` whose `status` is `built`, at most three, in data order, each with its name, a "Built" brand label, and its summary. A "See every product" link goes to `/products`. If no product is `built`, the label, heading, intro, and link still render and no empty list or grid is left in the DOM.
- **AC-6**: `#start` shows its label, heading, and body from `landingData.closing`, then a link named "Tell me about your project" to `/contact` that records `contact_click` with location `closing`.
- **AC-7**: On brand pages (`/`, `/products`, `/contact`) the header menu lists exactly "What I build" (`/#services`), "Products" (`/products`), and "Contact" (`/contact`), at desktop and 375px. On `/`, "What I build" scrolls smoothly to `#services` without a reload. From `/products` and `/contact` it navigates to `/` and lands on `#services`. "Contact" in the menu records `contact_click` with location `mobile_nav`, as the personal menu's contact item does today. The wordmark links to `/` and lands on the landing page. The `/personal` header is unchanged.
- **AC-8**: On brand pages the footer status line reads "Taking on new projects" (the pulse dot stays). The footer nav lists the same three items as AC-7, plus "For employers: my portfolio" to `/personal`. The copyright line reads "Copyright © Erskine Duenas, ED Solutions • All rights reserved". On brand pages the footer has no `id`, no "Seeking Full-Time Employment Opportunities" text, and no `/personal#` links. Its heading, "Contact Me" button (location `footer`), and email link stay. The `/personal` footer is unchanged.
- **AC-9**: Loading `/` with a hash of `#hero`, `#badges`, `#skills`, `#projects`, `#faqs`, or `#contact` ends at `/personal#<same id>` through `location.replace` (no extra history entry, so Back skips `/`). With any other hash, or none, the visitor stays on `/`.
- **AC-10**: `/` renders `<title>` equal to `seo.home.title` ("ED Solutions | Connected systems for small businesses"), with no layout template applied. Its meta description is `seo.home.description`, its canonical is `https://ed-solutions.dev/`, `og:site_name` is `ED Solutions`, `og:url` is the canonical, and `og:title` equals the title. The `og:image` and `twitter:image` URLs (read from the tags, never hardcoded) each return a 1200x630 PNG made by `renderBrandCard(seo.home.cardHeadline)`, with alt text `ED Solutions, <cardHeadline>`. The head links only the brand icons from spec 0015.
- **AC-11**: `/` carries one `application/ld+json` script holding an `Organization` with `name` "ED Solutions", `url` `https://ed-solutions.dev/`, `logo` `https://ed-solutions.dev/icons/ed-solutions-180.png`, `description` from `brandData.tagline`, and `founder` as a `Person` with `name` and `url` `https://ed-solutions.dev/personal`. It contains no email, phone, or address, and it is serialized with `toJsonLdString`. The `/personal` JSON-LD is unchanged.
- **AC-12**: `sitemap.xml` lists `https://ed-solutions.dev/`, then `/personal`, `/products`, and `/contact`, in that order. `robots.txt` is unchanged.
- **AC-13**: At desktop and 375px, in both themes, `/` has no horizontal scroll. The services cards stack on mobile and sit in three columns from `md`. The teaser products stack on mobile and sit in up to three columns from `md`. Every color on the page comes from brand tokens (the spec 0015 AC-2b rule: no `stone-*`, `white`, `black`, `neon-*`, or `red-orange-*` class). Labels use `.brand-label` and headings use `.brand-heading`.
- **AC-14**: Every link on `/` is reachable by Tab in reading order and shows a visible `ring-ring` focus ring. Each section is a `<section>` labelled by its heading through `aria-labelledby`. The two call to action links are real links (`<a href>`), so they work with JavaScript off.
- **AC-15**: Frozen pages stay frozen. `/personal` (look, header, footer, metadata, JSON-LD), the studio, and not found responses (including their title from `seo.personal`) are unchanged. `/products` and `/contact` change only in the brand header menu and brand footer described in AC-7 and AC-8.
- **AC-16**: `npm run lint`, `npm test`, `npm run build` (including the studio leak check), and `npm run test:e2e` pass. The `e2e/brand.spec.ts` crossover tests that click the wordmark and expect `/personal` are rewritten to cross through the footer's "For employers: my portfolio" link, and the wordmark is asserted to land on `/`. `src/lib/site.test.ts` asserts the new route list and that no redirect for `/` exists.

## Decision

**Chosen option**: Option 2: the landing page frame plus the sections no other feature owns.

`src/app/(site)/(brand)/page.tsx` composes a static hero, What I build, a products teaser, and a closing call to action, with landing copy in `utils/data/landing-data.ts`, brand nav and footer copy in `utils/data/brand-data.ts`, and reserved slots where features 40, 38, and 39 add their sections.

**Choices made by delegation** (2026-11-01: the engineer picked the design source, the section order, and this feature's slice, then asked for the recommended option on every remaining dimension): a footer link to `/personal`, not a header item or an about block; section ids and order; the three service cards and all landing copy; showing `built` products in the teaser; an `Organization` JSON-LD; a `title.absolute` page title; a client side hash forwarder; one shared `ContactLink` for calls to action; keeping the `(site)` layout's default title on the portfolio copy; no References section.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.claude/skills/tailwindcss-advanced-layouts/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Design source

The existing UI plus the spec 0015 brand. Reuse the `container` and `section` spacing the current sections use, the brand tokens and utilities (`.brand-label`, `.brand-heading`, `bg-card`, `text-muted-foreground`, `signal`), 16px rounded cards (`rounded-2xl`, `--radius`) with no hard borders, and the pill button look. No design tool frames and no screenshots are involved.

### Page composition (final order, with ownership)

| Order | Section id | Content | Built by |
|---|---|---|---|
| 1 | `pitch` | Hero: headline, stance line, credibility line, primary call to action | 33 (static); 34 adds motion, portrait, socials |
| 2 | `services` | "What I build": three benefit cards | 33 |
| 3 | `story` | Vital Stats case study teaser | 40 (reserved, not rendered in 33) |
| 4 | `work` | Selected projects with outcomes | 38 (reserved, not rendered in 33) |
| 5 | `ecosystem` | Products teaser | 33 |
| 6 | `questions` | Business FAQs | 39 (reserved, not rendered in 33) |
| 7 | `start` | Closing call to action | 33 |
| 8 | (none) | Brand footer | 33 (copy and links) |

Reserved slots are a comment in `page.tsx` naming the feature and id, never an empty element. A later feature that adds a section also adds its nav item to `brandData.nav` if it should be in the menu. Feature 35 adds section end calls to action through `ContactLink`.

### Files

| File | Change |
|---|---|
| `next.config.mjs` | Remove the `redirects()` entry and its comment. |
| `src/app/(site)/(brand)/page.tsx` (new) | Server component. Exports `metadata` (below). Renders the JSON-LD script, `<LegacyHashForward />`, `<Header variant="brand" />`, `<main>` with `LandingHero`, `Services`, `ProductsTeaser`, `ClosingCta`, then `<Footer variant="brand" />` and `<ScrollToTop variant="brand" />`. |
| `src/app/(site)/(brand)/opengraph-image.tsx` (new) | The same shape as `products/opengraph-image.tsx`, with `seo.home.cardHeadline`. It applies only to `/`, because `/products` and `/contact` have their own. |
| `src/sections/LandingHero.tsx` (new) | Server component, `<section id="pitch" aria-labelledby="pitch-heading">`. `<h1 id="pitch-heading" className="brand-heading">` headline (large: `text-5xl md:text-7xl lg:text-8xl`), stance line in `text-muted-foreground`, credibility line in `.brand-label`, then `<ContactLink location="hero">`. Fills at least the first viewport below the fixed header (`min-h-[calc(100svh)]` with top padding for the 80px bar). No motion. |
| `src/sections/Services.tsx` (new) | Server component, `<section id="services">`. Label, `<h2>`, then a list (`<ul>`) of three `bg-card rounded-2xl` cards: `grid gap-6 md:grid-cols-3`. Each card has an `<h3>` title and a `<p>` body. |
| `src/sections/ProductsTeaser.tsx` (new) | Server component, `<section id="ecosystem">`. Label, `<h2>`, intro, then a `<ul>` of up to three `built` products (`grid gap-6 md:grid-cols-3`), each a `bg-card` card with name (`<h3>`), a `.brand-label` "Built" badge in `text-signal`, and summary. Ends with a plain `next/link` "See every product" to `/products` (not tracked as a contact click). The `<ul>` is omitted when the list is empty. |
| `src/sections/ClosingCta.tsx` (new) | Server component, `<section id="start">`. Label, `<h2>`, body, `<ContactLink location="closing">`. |
| `src/components/brand/ContactLink.tsx` (new) | Client component: `<Link href="/contact" onClick={() => trackContactClick(location)} className={buttonClassName("pill", className)}>` with the label "Tell me about your project" (from `landingData.ctaLabel`) and the same arrow icon the footer button uses. Props: `location: ContactLocation`, optional `className`. Shared with feature 35. |
| `src/components/Button.tsx` | Extract the class list into an exported `buttonClassName(variant, className?)` and use it in `Button`, so `ContactLink` gets the identical pill look on an `<a>`. No visual change. |
| `src/components/LegacyHashForward.tsx` (new) | Client component that renders `null`. On mount: `const target = legacyHashTarget(window.location.hash); if (target) window.location.replace(target);` |
| `src/lib/section-nav.ts` | Add `PERSONAL_SECTION_IDS = ["hero", "badges", "skills", "projects", "faqs", "contact"] as const` and a pure `legacyHashTarget(hash: string): string \| null` that returns `/personal#<id>` for those ids and `null` otherwise. |
| `src/lib/analytics.ts` | `ContactLocation` adds `"hero"` and `"closing"`. Update the top comment to say these events signal recruiter and client interest. |
| `src/lib/json-ld.ts` | Add `organizationJsonLd()` (AC-11), using `brandData`, `personalData.name`, and `SITE_URL`. |
| `src/lib/site.ts` | `PUBLIC_ROUTES = ["/", "/personal", "/products", "/contact"]`. |
| `utils/data/seo-data.ts` | Add `home` (values below). |
| `utils/data/landing-data.ts` (new) | Landing copy (below). Public content only. |
| `utils/data/brand-data.ts` | Add `nav` and `footer` (below). |
| `src/sections/Header.tsx` | When `brand`, the menu maps `brandData.nav` instead of `navItems`. The mobile item handler records `mobile_nav` when the link's pathname is `/contact` or its hash is `#contact`. Nothing else changes. |
| `src/sections/Footer.tsx` | When `brand`: no `id`; status text from `brandData.footer.status`; nav from `brandData.nav` plus `brandData.footer.employerLink`; copyright from `brandData.footer.copyright`. The personal branch keeps today's markup, `id="contact"`, and copy. |
| `src/lib/site.test.ts`, `e2e/brand.spec.ts`, `e2e/landing.spec.ts` (new), `src/lib/section-nav.test.ts` (new or extended), `src/lib/json-ld.test.ts` (extend or new) | Tests (see *Critical test scenarios*). |

### Metadata (`page.tsx`)

```ts
export const metadata: Metadata = {
  title: { absolute: seo.home.title },
  description: seo.home.description,
  alternates: { canonical: "/" },
  openGraph: { ...openGraphBase, url: "/", title: seo.home.title, description: seo.home.description },
};
```

`title.absolute` keeps the brand layout's `%s | ED Solutions` template from doubling the name. The `(site)` layout's default title and description stay on `seo.personal`, because the only page that falls back to them is the frozen not found page (spec 0015, AC-9). This replaces the spec 0014 follow-up item that said to point them at the landing copy.

### Copy

`utils/data/seo-data.ts`, new entry:

```ts
home: {
  title: "ED Solutions | Connected systems for small businesses",
  description: "Erskine Duenas builds the connected systems small businesses run on: orders, payments, inventory, and the tools that tie them together.",
  cardHeadline: "I build the connected systems small businesses run on",
},
```

`utils/data/landing-data.ts`:

```ts
// Landing page copy for / (spec 0016). Public content only.
export const landingData = {
  ctaLabel: "Tell me about your project",
  hero: {
    headline: "I build the connected systems small businesses run on.",
    stance: "I don't build marketing sites. I build the systems behind them.",
    credibility: "Application Developer at IBM by day, building for small businesses.",
  },
  services: {
    label: "What I build",
    heading: "Systems that take work off your plate",
    cards: [
      { title: "Your tools, talking to each other", body: "Orders, payments, and inventory move between your systems on their own, so nobody retypes data at the end of the day." },
      { title: "Built around how you work", body: "I start from your process, not a template, and build only what saves you time." },
      { title: "Support after launch", body: "I keep your systems running and growing after go live, so you are never left with software nobody looks after." },
    ],
  },
  ecosystem: {
    label: "Products",
    heading: "Systems already running",
    intro: "Some of what I build is already live for small businesses. Each piece works on its own and connects to the rest.",
    linkLabel: "See every product",
  },
  closing: {
    label: "Start here",
    heading: "Tell me what's slowing your business down.",
    body: "Send a short note about your project, and I'll get back to you with next steps.",
  },
} as const;
```

`utils/data/brand-data.ts`, added fields:

```ts
nav: [
  { label: "What I build", href: "/#services" },
  { label: "Products", href: "/products" },
  { label: "Contact", href: "/contact" },
],
footer: {
  status: "Taking on new projects",
  employerLink: { label: "For employers: my portfolio", href: "/personal" },
  copyright: "Copyright © Erskine Duenas, ED Solutions • All rights reserved",
},
```

The closing copy promises no reply time on purpose. Feature 36 owns that commitment.

### Data model sketch

No database change. The page reads static public data only: `landingData`, `brandData`, `seo.home`, and `productsData` (public fields, spec 0002).

### API surface

No new endpoint. The surfaces are a statically rendered page and its generated image.

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/` | GET | URL hash (client only, for the forwarder) | Landing HTML, 200 | Public | none (static) |
| `/opengraph-image` (Next hashed URL under `/`) | GET | none | 1200x630 PNG | Public | none |
| `/sitemap.xml` | GET | none | Four URLs | Public | none |
| Vercel Analytics `contact_click` | client event | `location`: `hero` · `closing` · `header` · `mobile_nav` · `footer` | event row | none | dropped silently if blocked |

### Value sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| Render hero | Headline, stance, credibility, button label | `landingData.hero`, `landingData.ctaLabel` (feature 34's decided copy) |
| Render services | Label, heading, three cards | `landingData.services` |
| Render teaser | Product list | `productsData` filtered to `status === "built"`, first three in data order |
| Render teaser | "Built" label | the existing status title map in `Products.tsx` (`built` → "Built"); import or mirror it, do not invent new text |
| Render closing | Label, heading, body | `landingData.closing` |
| Header and footer nav | Items and hrefs | `brandData.nav`; employer link from `brandData.footer.employerLink` |
| Footer | Status line, copyright | `brandData.footer` |
| Metadata | Title, description, card headline | `seo.home` |
| Metadata | Canonical and `og:url` absolute URL | `metadataBase` from `SITE_URL` in `src/lib/site.ts` |
| Metadata | Site name, locale, type | `openGraphBase` |
| JSON-LD | Name, tagline, logo, founder name, founder url | `brandData.name`, `brandData.tagline`, `SITE_URL` + `/icons/ed-solutions-180.png`, `personalData.name`, `SITE_URL` + `/personal` |
| Track click | `location` | the `ContactLink` prop at each call site (`hero`, `closing`); `mobile_nav` from the header handler |
| Forward hash | Target URL | `legacyHashTarget(window.location.hash)` over `PERSONAL_SECTION_IDS` |
| Sitemap | Route list | `PUBLIC_ROUTES` |

### Key invariants

- The six portfolio ids in `PERSONAL_SECTION_IDS` are never used as element ids on `/` (the forwarder would hijack them).
- `/` is the only landing route, and its canonical is `/`.
- Landing copy lives in `utils/data/`, never inline in a section.
- Every call to action to `/contact` on the landing page goes through `ContactLink`, so it always records a `location`.
- The redirect for `/` stays removed. No new redirect is added for it.

### Security model

Public, static, read only. No personal data reaches analytics (only the `location` string). The JSON-LD holds public fields only, matching spec 0009. `landing-data.ts` holds no client names, notes, or ticket keys, matching the `/products` rule. Public code imports nothing from `src/studio/`.

### Rendering and performance

The page and its four sections are server components and render statically at build time. Only `ContactLink`, `LegacyHashForward`, `Header`, `Footer`, and `ScrollToTop` are client code, and the last three already ship. No images are added in this feature (the portrait arrives with feature 34).

### Failure and edge cases

- **No `built` product**: the teaser drops its list and keeps its heading, intro, and link (AC-5).
- **JavaScript off or blocked**: the calls to action are plain links and still reach `/contact`. Tracking is skipped. The hash forwarder does not run, so an old `/#projects` link shows the landing page top, which is accepted.
- **Analytics blocked**: `track` fails silently and navigation still happens.
- **Forwarder flash**: the landing page may paint for one frame before `location.replace` runs. That is accepted, the same tradeoff the spec 0015 crossover accepts.
- **Same page nav**: on `/`, `/#services` is handled by `scrollToSectionIfSamePage`. From another route the browser navigates and scrolls to the id itself.
- **Fixed header covers the section top**: each landing section sets `scroll-mt-20` so a hash jump lands below the 80px bar.

### Configuration required

None. No new environment variables or credentials.

### Critical test scenarios

- Happy path: `/` returns 200 with no redirect, dark by default, and the sections `pitch`, `services`, `ecosystem`, `start` appear in order with one `h1`. Verifies **AC-1**, **AC-2**.
- Hero and closing links: each is a link to `/contact` named "Tell me about your project", and clicking it lands on `/contact` (unit test the `ContactLink` call with a mocked `track` for `hero` and `closing`). Verifies **AC-3**, **AC-6**.
- Content: three service cards, and the teaser shows the `built` products with a link to `/products`. A unit test renders `ProductsTeaser` with an empty list and finds no `<ul>`. Verifies **AC-4**, **AC-5**.
- Navigation: from `/products`, the menu's "What I build" ends on `/#services` with the section in view. On `/`, it scrolls without a reload. The wordmark from `/contact` lands on `/`. Verifies **AC-7**.
- Footer: on `/` and `/products`, "For employers: my portfolio" goes to `/personal`, and the job seeking line is gone. On `/personal`, the footer still has it and keeps `id="contact"`. Verifies **AC-8**, **AC-15**.
- Legacy links: `/#projects` ends at `/personal#projects`, and `page.goBack()` does not land on `/`. `/#services` stays on `/`. Unit test `legacyHashTarget` for all six ids, an unknown id, and an empty hash. Verifies **AC-9**.
- Metadata: title, description, canonical, `og:*`, a 1200x630 PNG card, and brand icons. Verifies **AC-10**.
- JSON-LD: parse the script, check the `Organization` fields, and check it contains no `@` email or `tel`. Verifies **AC-11**.
- Sitemap and routes: `PUBLIC_ROUTES` equals the four routes, and `nextConfig.redirects` is undefined or has no `/` source. Verifies **AC-12**, **AC-16**.
- Layout: no horizontal scroll at 375px and desktop in both themes. Tab through `/` and every link shows a focus ring. Verifies **AC-13**, **AC-14**.
- Failure case: no `built` products leaves no empty grid. Verifies **AC-5**.
- Auth or permission: not applicable, the page is public. Check that no studio import enters the public bundle (the build's leak check). Verifies **AC-16**.

## Build plan

Tracer Bullet: the first slice puts a real, thin landing page live at `/` end to end (route, metadata, one section, call to action, tracking). Each later slice thickens it, and every slice leaves the site shippable.

1. **Thin thread live at `/`**: remove the redirect, add `(brand)/page.tsx` with `metadata`, `seo.home`, `landing-data.ts`, `buttonClassName`, `ContactLink`, the `hero` and `closing` analytics locations, and `LandingHero`. Add `/` to `PUBLIC_ROUTES` and update `site.test.ts`. Satisfies **AC-1**, **AC-3**, **AC-10** (title, description, canonical), **AC-12**.
2. **Share card and structured data**: `(brand)/opengraph-image.tsx` and `organizationJsonLd()` with its test. Satisfies **AC-10**, **AC-11**.
3. **Remaining sections**: `Services`, `ProductsTeaser` (with the empty list case and its unit test), `ClosingCta`, section ids, `scroll-mt-20`, and `aria-labelledby`. Satisfies **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-13**, **AC-14**.
4. **Brand nav, footer, and old links**: `brandData.nav` and `footer`, the brand branches in `Header` and `Footer`, `PERSONAL_SECTION_IDS`, `legacyHashTarget` with its test, and `LegacyHashForward`. Satisfies **AC-7**, **AC-8**, **AC-9**, **AC-15**.
5. **Checks**: write `e2e/landing.spec.ts`, rewrite the `brand.spec.ts` crossover tests, then run lint, unit tests, build, and e2e. Do a browser pass at desktop and 375px in both themes, including `/personal`, `/products`, `/contact`, and a not found URL. Satisfies **AC-13**, **AC-15**, **AC-16**.

## Consequences

**Positive**:
- The domain finally speaks to clients. Every link that used to bounce to `/personal` now lands on the business pitch.
- Features 34, 35, 38, 39, and 40 each have a named slot, id, and copy file to build into, so none of them reworks the page.
- `ContactLink` gives every call to action the same look and tracking, which feature 37's conversion tracking builds on.

**Negative / tradeoffs**:
- Until 38, 39, and 40 ship, the page is short (hero, services, products, closing), with no story or proof section yet. It is complete, but thin on evidence.
- Old `/#section` links depend on JavaScript and may show the landing page for one frame first.
- Visitors who remember the domain as the portfolio now land on the business page and need the footer link to reach `/personal`.
- The hero ships static here, and feature 34 reworks the same file to add motion and the portrait. That is a small, planned second touch.

**Neutral**:
- `Button` gains an exported class helper, a small refactor with no visual change.
- The not found page keeps the portfolio title and look, so it reads off brand when reached from a business page. That keeps the frozen pages rule from spec 0015.

## Follow-up

- [ ] `/sync`: update the root `AGENTS.md` rules that say `/` is a temporary 307 redirect to `/personal`, and add that landing sections live in `src/sections/` and compose in `src/app/(site)/(brand)/page.tsx`, with ids that never reuse the six portfolio ids.
- [ ] Spec 0014's follow-up items about feature 38 (redirect removal, hash forwarding, the root card) were really feature 33's work. Mark them done in 0014 when this ships, and note there that the layout default title intentionally stays on `seo.personal`.
- [ ] Spec 0015's follow-up item on the brand nav and footer copy closes when this ships.
- [ ] Features 34, 38, 39, and 40: add your section in the reserved slot and id from *Page composition*, and add a `brandData.nav` item if it belongs in the menu.
- [ ] Erskine: read the landing copy in `landing-data.ts` and the footer copy in `brand-data.ts` once on the page. It was drafted by delegation.
