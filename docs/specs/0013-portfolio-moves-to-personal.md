# 0013. Move the portfolio home page to `/personal`

**Date**: 2026-10-25
**Status**: Proposed

## Summary

Today's home page moves, unchanged, to a new public page at `/personal`, the page for employers and recruiters. Until the ED Solutions landing page (scope feature 38) is ready, `/` sends visitors to `/personal` with a temporary redirect (an instruction that says "this lives somewhere else for now"). The search setup from spec 0009 moves with the page: its canonical link, share card, Person profile data, and sitemap entry now point at `/personal`. Header and footer section links point at `/personal#<section>`, so they scroll on that page and still work from `/products` and `/contact`.

## Context

The site is being split in two (scope slice "Sales slice: Client positioning"). Employers need the current portfolio as it is, CV download included. Small business clients need a new ED Solutions landing page at `/`. Both pages cannot live at `/`, so the portfolio has to move first, without breaking the links people already have: the bare domain, `/#projects` style section links in the header and footer, links in your CV and on LinkedIn, and the search and share setup from spec 0009.

The landing page is several features away (rebrand 37, landing page 38). In the meantime, `/` must not show a blank page or a half built landing page. Feature 38 also needs a clear handover: which of the things this spec adds it must undo or keep.

Everything here is routing and metadata on the existing Next 16 App Router site. It adds no dependency, no data, and no studio change.

## Requirements

**User stories**:
- As a recruiter with a link to `/`, `/#projects`, or `/personal`, I want to land on Erskine's portfolio at the right section so the link I was given still works.
- As a recruiter searching Erskine's name, I want the result to open the portfolio page with the same title and description it has today.
- As Erskine, I want the portfolio kept exactly as it is at its own address, so the landing page at `/` can change freely later.

**Acceptance criteria**:
- **AC-1**: `/personal` renders today's home page with no visual or behavior change: Header, Hero (with Download CV), Badges, Intro, Skills, Projects, FAQs, Footer, and ScrollToTop, in that order, at desktop and 375px in both themes.
- **AC-2**: A request for `/` answers with a temporary redirect (HTTP 307) to `/personal`. Opening `/#projects` in a browser ends on `/personal#projects` with the Projects section in view (the browser carries the `#` part across the redirect). There is no longer a page file at `/`.
- **AC-3**: `/personal` renders `<title>Erskine Duenas | Software Engineer and Aspiring Architect</title>` (exactly today's home title, not passed through the `%s | Erskine Duenas` template) and today's home description. Its `<link rel="canonical">` is `https://ed-solutions.dev/personal`, and `og:url` matches it. All the other spec 0009 AC-4 Open Graph and Twitter fields are still present.
- **AC-4**: The `og:image` URL on `/personal` (read it from the tag, never hardcode it) returns a 1200x630 PNG with today's home headline "Architecting systems end to end". `/profile-image` still returns the same PNG.
- **AC-4b**: `/contact` and `/products` each still emit an `og:image` and a `twitter:image` that return a 1200x630 PNG. `/contact` gets its own card with `seo.contact.cardHeadline` ("Tell me about your project"), because it used to inherit the root card that this spec moves away.
- **AC-5**: `/sitemap.xml` lists exactly `https://ed-solutions.dev/personal`, `https://ed-solutions.dev/products`, and `https://ed-solutions.dev/contact`: no bare `/` and no `/studio` URL. `robots.txt` is unchanged.
- **AC-6**: `/personal` holds exactly one `<script type="application/ld+json">`: the spec 0009 ProfilePage and Person, with `mainEntity.url` now `https://ed-solutions.dev/personal` and every other field unchanged. The `<` escaping from spec 0009 AC-9 still holds.
- **AC-7**: Every section link has an href of `/personal#<id>`: the six in the header (`#hero`, `#badges`, `#skills`, `#projects`, `#faqs`, and `#contact`, which is the footer's own id) and the four in the footer (`#hero`, `#skills`, `#projects`, `#faqs`). On `/personal`, clicking one smooth scrolls with no navigation. From `/products` or `/contact`, clicking one opens `/personal` at that section. The Products link stays `/products`, and the Contact Me buttons still go to `/contact`.
- **AC-8**: The header logo and the 404 page's home link still point at `/`, and today they land on `/personal` (top of the page) through the redirect, on a client side click as well as a full load.
- **AC-9**: A Vitest unit test covers the routing facts: `PUBLIC_ROUTES` is exactly `["/personal", "/products", "/contact"]`, `profilePageJsonLd().mainEntity.url` is `https://ed-solutions.dev/personal`, and the `next.config.mjs` `redirects()` result holds `{ source: "/", destination: "/personal", permanent: false }`.
- **AC-10**: `npm run lint`, `npm test`, and `npm run build` (ending with `[leak-check] clean`) pass. No file under `src/studio/` or `src/app/(studio)/` changes.

## Decision

Move the page files into `src/app/(site)/personal/` and add a temporary redirect from `/` to `/personal` in `next.config.mjs`. Rename the `home` SEO copy entry to `personal`, with identical values. Point the sitemap, the JSON-LD, and the section links at `/personal`. Home links (the logo and the 404 link) stay at `/`, so they need no change when the landing page arrives.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`)

## Options considered

1. **Move plus a temporary config redirect (chosen).** One commit, reverted by one revert. A 307 tells search engines the move is temporary, so `/` keeps its place in search until feature 38 puts the landing page there.
2. **Keep the portfolio rendering at both `/` and `/personal`**, with `/` canonical to `/personal`. No redirect, but it is a duplicate page, and feature 38 would have to find and remove it. It also confuses which URL people share.
3. **Wait and ship together with feature 38.** Nothing to design for the meantime, but it ties a small, safe move to the biggest feature in the slice and blocks feature 37's `/personal` decision from being checked live.

## Rationale

A config redirect is the smallest change that keeps every old link working. Browsers keep the `#section` part across a redirect, so `/#projects` reaches `/personal#projects` with no script. It is also the easiest to remove: feature 38 deletes one redirect entry and adds a page. A temporary redirect is chosen over a permanent one (308) because `/` is coming back as a real page. A permanent redirect is cached by browsers and would keep sending returning visitors to `/personal` after the landing page ships.

The section links point straight at `/personal#…` instead of relying on the redirect. That way they keep working once `/` becomes the landing page, and `scrollToSectionIfSamePage` needs no change (it already compares paths). The logo and 404 links keep `/`, because their meaning is "site home", which is about to become the landing page.

The `home` SEO copy entry is renamed `personal` rather than copied, so there is one source of the portfolio copy. Feature 38 adds a new `home` entry for the landing page and points the layout defaults at it.

## Design

**Files that move** (use `git mv` so the history follows):
- `src/app/(site)/page.tsx` → `src/app/(site)/personal/page.tsx`. Metadata: `title: { absolute: seo.personal.title }`, `description: seo.personal.description`, `alternates.canonical: "/personal"`, and `openGraph: { ...openGraphBase, url: "/personal", title, description }`. The JSON-LD script and the section list stay as they are.
- `src/app/(site)/opengraph-image.tsx` → `src/app/(site)/personal/opengraph-image.tsx`, reading `seo.personal.cardHeadline`, with `alt` still `Erskine Duenas, ${seo.personal.cardHeadline}`. Both moved files sit one folder deeper, so their `utils/data/seo-data` import gains one `../` (`"../../../../utils/data/seo-data"`). The `twitter:image` on `/personal` falls back to this same card, and `twitter.card` still comes from the layout. The Open Graph title and description values are unchanged (same strings, new key).

**New file**:
- `src/app/(site)/contact/opengraph-image.tsx`: the same shape as `products/opengraph-image.tsx`, with headline `seo.contact.cardHeadline`. The root card was the only card `/contact` had (it inherited it), and the move would otherwise leave `/contact` with no share image. Until feature 38, `/` and the 404 page have no card, which is fine because `/` only redirects.

**Files that change**:
- `next.config.mjs`: add `async redirects()` returning `[{ source: "/", destination: "/personal", permanent: false }]`. Leave `headers()` as it is.
- `utils/data/seo-data.ts`: rename the `home` key to `personal`, values unchanged. Update every reader: `layout.tsx` (default title and description use `seo.personal` until feature 38; only pages that set no title of their own see it, today the 404 page), `profile-image/route.tsx`, and the moved page and card.
- `src/lib/site.ts`: `PUBLIC_ROUTES = ["/personal", "/products", "/contact"]`.
- `src/lib/json-ld.ts`: `url: new URL("/personal", SITE_URL).href`. `image` stays `${SITE_URL}/profile-image`.
- `src/sections/Header.tsx` and `src/sections/Footer.tsx`: each `navItems` href `/#<id>` becomes `/personal#<id>` (six in the header, four in the footer, see AC-7).
- `src/lib/section-nav.ts`: code unchanged; update the comment example from `"/#projects" from "/products"` to `"/personal#projects" from "/products"`.
- New unit test beside `src/lib/site.ts` (e.g. `src/lib/site.test.ts`) for AC-9, importing `PUBLIC_ROUTES`, `profilePageJsonLd`, and the default export of `next.config.mjs`. `/products` and the Contact Me `/contact` buttons are untouched, and so is the logo `Link href="/"`.

**Unchanged on purpose**: `src/app/(site)/not-found.tsx` (its link stays `/`), `robots.ts`, `profile-image/route.tsx`'s path, `section-nav.ts`'s code, every section component except the Header and Footer link lists, and all studio code.

**Value sourcing**:

| Value | Source |
|---|---|
| Canonical and `og:url` for `/personal` | literal `"/personal"` in the page metadata, resolved against `metadataBase` (`SITE_URL`) |
| Title, description, card headline | `seo.personal` in `utils/data/seo-data.ts` (today's `home` values) |
| Sitemap URLs | `PUBLIC_ROUTES` joined with `SITE_URL` |
| JSON-LD `url` | `SITE_URL` plus `/personal` |
| Redirect status | `permanent: false` in `next.config.mjs` (Next sends 307) |

**Key invariants**:
- No `/studio` path is added to `PUBLIC_ROUTES`, and `robots.txt` still never disallows `/studio`.
- Exactly one Person JSON-LD block on the public site, on `/personal`.
- A section link always names its page path (`/personal#…`), never a bare `#…`.

**Security model**: no change. Public pages only, and the JSON-LD keeps its public fields only (no email, phone, or address).

**Critical test scenarios**:
- Happy path: open `/`, land on `/personal`, scroll through every section, verifies **AC-1**, **AC-2**
- Old link: open `/#projects` and `/#faqs`, land at that section of `/personal`, verifies **AC-2**
- SEO: view source on `/personal` (title, canonical, Open Graph tags, one JSON-LD block), fetch `/sitemap.xml` and the `og:image` URL, verifies **AC-3** to **AC-6**
- Navigation: from `/products`, click Projects in the header, land at `/personal#projects`. On `/personal`, click FAQs, and it smooth scrolls with no reload, verifies **AC-7**
- Share cards: the `og:image` on `/contact` and `/products` returns a PNG, verifies **AC-4b**
- Home links: click the logo on `/products`, and hit a missing URL then its home link, both reach `/personal`, verifies **AC-8**

## Build plan

1. Thin thread: `git mv` the page and its card into `personal/`, set the `/personal` canonical and Open Graph `url`, and add the temporary redirect in `next.config.mjs`. Check `/` → `/personal` and `/#projects` in the browser, satisfies **AC-1**, **AC-2**
2. SEO surfaces: rename `seo.home` to `seo.personal` and update every reader (layout defaults, page, card, `profile-image`), switch `PUBLIC_ROUTES` and the JSON-LD `url`, use `title.absolute` on `/personal`, and add the `/contact` card, satisfies **AC-3**, **AC-4**, **AC-4b**, **AC-5**, **AC-6**
3. Navigation: point the header and footer `navItems` at `/personal#<id>`, update the `section-nav.ts` comment, and leave the logo and 404 home links at `/`, satisfies **AC-7**, **AC-8**
4. Checks: the routing unit test, then `npm run lint`, `npm test`, `npm run build` (`[leak-check] clean`), and a browser pass at desktop and 375px in both themes over the scenarios above, satisfies **AC-9**, **AC-10** (and confirms **AC-1** to **AC-8**)

## Migration plan

**Strategy**: big bang behind a temporary redirect (one deploy, nothing else to migrate).
**Phases**:
1. This feature: the portfolio is served at `/personal`, and `/` sends a 307 to it.
2. Feature 38: remove the redirect entry, add the landing page at `/` with its own `seo.home` copy, share card, and canonical, put `/` back in `PUBLIC_ROUTES`, and point the layout's default title and description at the landing copy.
**Rollback**: revert the one commit. The page returns to `/`, and the redirect and link changes go with it.
**Risks**: search engines may show `/` or `/personal` for a while after the move (harmless with a 307, since both reach the portfolio). Vercel Analytics page views move from `/` to `/personal`, and `/` records none at all (the redirect answers before any page renders), so compare the two paths when you look at trends across the change date. A client side click on a `/` link follows the redirect but lands at the top of `/personal`, since only full page loads carry a `#section` across.

## Consequences

**Positive**:
- Every existing link keeps working (the bare domain, `/#section` links, CV and LinkedIn links).
- `/` is free for the landing page, and removing the redirect is a one line change.
- Section links name their page, so they survive the landing page with no further edits.

**Negative / tradeoffs**:
- Until feature 38, `/` (and the 404 page) has no page card, and `/` has no JSON-LD of its own. Sharing the bare domain shows the `/personal` card after the redirect, which some preview tools do not follow.
- Page view history splits at the move date (`/` before, `/personal` after).

**Neutral**:
- This spec supersedes spec 0009 in part: its AC-3, AC-5, AC-6, and AC-8 statements about `/` (canonical, card, sitemap, JSON-LD) now apply to `/personal`. Spec 0009 stays `Accepted`; add a one line note at its top pointing here when this feature is built.

## Follow-up

- [ ] Spec 0009: add the "partly superseded by spec 0013" note at its top during the build.
- [ ] Feature 38 contract: once `/` is the landing page, an old `/#hero`, `/#badges`, `/#skills`, `/#projects`, `/#faqs`, or `/#contact` link no longer passes through the redirect. Forward those ids to `/personal#<same id>` with a small client script on `/`, and do not reuse those six ids as landing page section ids.
- [ ] Feature 38: remove the `/` redirect, add `/` back to `PUBLIC_ROUTES`, add a `home` SEO entry and a root share card, and move the layout's default title and description to the landing copy.
- [ ] Feature 37 (rebrand): decide how much of the ED Solutions brand `/personal` uses. The site name in metadata (`SITE_NAME`, the title template) is shared by both pages today.
- [ ] `/sync`: update the root `AGENTS.md` rules that say page sections compose in `src/app/(site)/page.tsx` and that section links use `/#<section-id>` (now `src/app/(site)/personal/page.tsx` and `/personal#<section-id>`).
