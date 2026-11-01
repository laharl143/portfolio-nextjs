# Verify: Portfolio moves to /personal · spec 0014 · updated 2026-11-01
_Steps derived from spec 0014 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open `/personal` at desktop and 375px, light and dark → Header, Hero (with Download CV), Badges, Intro, Skills, Projects, FAQs, Footer, ScrollToTop in that order, looking as `/` did before → AC-1
- [x] Open `/` → the browser ends on `/personal` → AC-2
- [x] Open `/#projects` and `/#faqs` → ends on `/personal#projects` and `/personal#faqs` with that section in view → AC-2
- [x] View source on `/personal` → `<title>` is exactly `Erskine Duenas | Software Engineer and Aspiring Architect`, description is today's home copy, canonical and `og:url` are `https://ed-solutions.dev/personal`, the other Open Graph and Twitter tags are present → AC-3
- [x] Read the `og:image` URL from the `/personal` tag and fetch it → 1200x630 PNG with "Architecting systems end to end"; `/profile-image` still returns the same card → AC-4
- [x] Read `og:image` and `twitter:image` on `/contact` and `/products` → each returns a 1200x630 PNG; the `/contact` card says "Tell me about your project" → AC-4b
- [x] View source on `/personal` → exactly one `application/ld+json` script, `mainEntity.url` is `https://ed-solutions.dev/personal`, other fields unchanged, no raw `<` inside it → AC-6
- [x] On `/personal`, click each header link (open the menu at narrow widths) and each footer link → smooth scroll, no reload → AC-7
- [x] From `/products` and `/contact`, click Projects in the header → opens `/personal#projects` at Projects; Products link stays `/products`, Contact Me goes to `/contact` → AC-7
- [x] Inspect hrefs → header has six `/personal#<id>` links (`hero`, `badges`, `skills`, `projects`, `faqs`, `contact`), footer has four (`hero`, `skills`, `projects`, `faqs`) → AC-7
- [x] Click the header logo on `/products` (client side) and load `/` fresh → both land at the top of `/personal` → AC-8
- [x] The custom 404's home link still points at `/` → AC-8 (note: unknown URLs show Next's default 404 because the app has two root layouts; the custom one renders only on a `notFound()` call inside `(site)`)

## Commands
- [x] `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:3000/` → `307 http://localhost:3000/personal` → AC-2
- [x] Fetch `/sitemap.xml` → exactly `/personal`, `/products`, `/contact` under `https://ed-solutions.dev`, no bare `/`, no `/studio` → AC-5
- [x] Fetch `/robots.txt` → unchanged, never disallows `/studio` → AC-5
- [x] `npx vitest run src/lib/site.test.ts` → 3 passing (routes, JSON-LD url, redirect entry) → AC-9
- [x] `npm run lint`, `npm test`, `npm run build` → all pass, build ends with `[leak-check] clean` → AC-10
- [x] `git diff main -- src/studio "src/app/(studio)"` → no code changes from this feature → AC-10

## Value sourcing
- [x] Canonical and `og:url` resolve the literal `/personal` against `metadataBase`: they read `https://ed-solutions.dev/personal` even on localhost or a preview host → Value sourcing
- [x] Title, description, card headline come from `seo.personal`: no `seo.home` reader is left (`grep -rn "seo\.home" src utils` is empty) → Value sourcing
- [x] Sitemap URLs are `PUBLIC_ROUTES` joined with `SITE_URL` → Value sourcing
- [x] JSON-LD `url` is `SITE_URL` plus `/personal` → Value sourcing
- [x] Redirect status comes from `permanent: false`: status is 307, never 308 → Value sourcing

## Acceptance-criteria coverage
- AC-1 UI step 1 · AC-2 UI steps 2 and 3, command 1 · AC-3 UI step 4 · AC-4 UI step 5 · AC-4b UI step 6 · AC-5 commands 2 and 3 · AC-6 UI step 7 · AC-7 UI steps 8 to 10 · AC-8 UI steps 11 and 12 · AC-9 command 4 · AC-10 commands 5 and 6
