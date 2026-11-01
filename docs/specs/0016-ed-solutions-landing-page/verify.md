# Verify: ED Solutions landing page · spec 0016 · updated 2026-11-01 (verified)
_Steps derived from spec 0016 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open `/` in a fresh browser (no saved theme) → 200 with no redirect, dark, `<main>` holds `#pitch`, `#services`, `#ecosystem`, `#start` in that order, then the footer; exactly one `h1`; none of `hero`, `badges`, `skills`, `projects`, `faqs`, `contact` as an id → AC-1, AC-2
- [x] Hero → static headline, stance line, and credibility line; "Tell me about your project" is a link to `/contact` and records `contact_click` with location `hero` → AC-3
- [x] `#services` → "What I build" label, heading, and three cards that match `landingData.services` → AC-4
- [x] `#ecosystem` → label, heading, and intro from `landingData.ecosystem`; only `built` products (at most three, data order), each with a "Built" label and summary; "See every product" goes to `/products` → AC-5
- [x] `#start` → label, heading, and body from `landingData.closing`; its link goes to `/contact` and records location `closing` → AC-6
- [x] On `/products`, open the menu → exactly "What I build", "Products", "Contact"; "What I build" lands on `/#services` with the section in view. On `/` it scrolls with no reload. "Contact" records `mobile_nav`. The wordmark from `/contact` lands on `/` → AC-7
- [x] Footer on `/` and `/products` → "Taking on new projects" with the pulse dot; links "What I build", "Products", "Contact", "For employers: my portfolio" (to `/personal`); copyright "Copyright © Erskine Duenas, ED Solutions • All rights reserved"; no `id`, no job seeking line, no `/personal#` links; "Contact Me" and the email link still there → AC-8
- [x] Visit `/products`, then `/#projects` → ends at `/personal#projects`; Back returns to `/products`, not `/`. Repeat for `#hero`, `#badges`, `#skills`, `#faqs`, `#contact`. `/#services` stays on `/` → AC-9
- [x] `/` head → title "ED Solutions | Connected systems for small businesses", description from `seo.home`, canonical `https://ed-solutions.dev/`, `og:site_name` "ED Solutions", `og:url` the canonical, `og:title` the title; the `og:image` and `twitter:image` URLs each return a 1200x630 PNG with alt "ED Solutions, I build the connected systems small businesses run on"; only the brand icons → AC-10
- [x] One `application/ld+json` script → an `Organization` with name, url, logo, description (`brandData.tagline`), and a `founder` `Person` with url `/personal`; no email, phone, or address → AC-11
- [x] Desktop and 375px, dark and light → no horizontal scroll; service and teaser cards stack on mobile and sit in columns from `md`; brand token colors only; labels use `.brand-label`, headings `.brand-heading` → AC-13
- [x] Tab through `/` → every link is reached in reading order and shows the `ring-ring` focus ring; each section is labelled by its heading; with JavaScript off both calls to action still reach `/contact` → AC-14
- [x] `/personal`, `/studio/login`, and a not found URL → look, header, footer, title, and JSON-LD unchanged → AC-15

## Commands
- [x] `npm run lint` → clean → AC-16
- [x] `npm test` → all pass (includes `site.test.ts`, `section-nav.test.ts`, `json-ld.test.ts`, `ProductsTeaser.test.tsx`, `ContactLink.test.tsx`) → AC-5, AC-9, AC-11, AC-12, AC-16
- [x] `npm run build` → succeeds and the studio leak check is clean → AC-16
- [x] `npm run test:e2e` (behind a proxy set `NO_PROXY=localhost`) → all pass, including `e2e/landing.spec.ts` and the rewritten `e2e/brand.spec.ts` crossovers → AC-16
- [x] `curl -s localhost:3000/sitemap.xml` → `/`, `/personal`, `/products`, `/contact` in that order; `robots.txt` unchanged → AC-12

## Value sourcing
- [x] Edit one string in `landingData` → the matching hero, services, teaser, or closing text changes → landing copy source
- [x] Temporarily set every product's status away from `built` (or rely on the unit test) → the teaser keeps label, heading, intro, and link, and renders no `<ul>` → teaser filter
- [x] Edit `brandData.nav` → the header menu and footer both follow → nav source
- [x] `legacyHashTarget` → the six ids map to `/personal#<id>`, anything else is `null` → forwarder source
- [x] `PUBLIC_ROUTES` → the sitemap order follows it → sitemap source

## Acceptance-criteria coverage
- AC-1, AC-2: step 1 · AC-3: step 2 · AC-4: step 3 · AC-5: step 4 and the teaser unit test · AC-6: step 5 · AC-7: step 6 · AC-8: step 7 · AC-9: step 8 and the `legacyHashTarget` unit test · AC-10: step 9 · AC-11: step 10 and the `json-ld` unit test · AC-12: sitemap command · AC-13: step 11 · AC-14: step 12 · AC-15: step 13 · AC-16: the commands
