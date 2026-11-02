# Verify: Section calls to action · spec 0018 · updated 2026-11-02
_Steps derived from spec 0018 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] On `/`, the link "Tell me about your project" at the end of `#services` (after the three cards) has `href="/contact"`; clicking it lands on `/contact` and records `contact_click` with `{ location: "services" }` → AC-1, AC-4
- [x] In `#ecosystem`, the last row holds exactly two links in order: "Tell me about your project" (`/contact`), then "See every product" (`/products`); clicking the first records `{ location: "ecosystem" }` → AC-2, AC-4
- [x] Render `ProductsTeaser` with no `built` product: no `<ul>`, and both links still render in the same order → AC-2
- [x] The two section links have no pill look (no `rounded-full`, `bg-primary`, or border), an underlined label, and the arrow; on hover the text turns `text-signal` and the arrow slides → AC-3
- [x] With reduced motion on, hovering a section link changes the color but the arrow does not slide → AC-3
- [x] The hero (`#pitch`) and closing (`#start`) links keep the filled pill, unchanged → AC-3, AC-7
- [x] With JavaScript off, both section links are real `<a href="/contact">` elements that navigate → AC-5
- [x] On desktop, Tab from the last service card reaches the services link, then the Products contact link, then "See every product", each with a visible `ring-ring` focus ring; the accessible name is exactly "Tell me about your project" → AC-5
- [x] At desktop and 375px, in light and dark: no horizontal scroll on `/`; the Products links sit side by side on desktop and wrap with a clear gap at 375px; each new link is at least 24px tall → AC-6
- [x] `/personal`, `/products`, `/contact`, the studio, and the header and footer on `/` look and behave as before → AC-7

## Value sourcing
- [ ] Label: change `landingData.ctaLabel` temporarily and confirm every section link follows it (no hardcoded copy) → AC-1, AC-2
- [x] Location: each click's `location` equals the section id of the call site (`services`, `ecosystem`), never `hero` or `closing` → AC-4
- [x] Look: the `variant` prop decides the look; `ContactLink` with no variant still renders the pill → AC-3
- [x] "See every product" still reads `landingData.ecosystem.linkLabel` and points to `/products` → AC-2

## Commands
- [x] `npm run lint` → clean → AC-7
- [x] `npm test` → all pass (includes `ContactLink`, `ProductsTeaser`, `Services` tests) → AC-1 to AC-4
- [x] `npm run build` → succeeds, studio leak check clean → AC-7
- [x] `npm run test:e2e` (behind a proxy `NO_PROXY=localhost`) → all pass, including the two `0018` tests in `e2e/landing.spec.ts` → AC-1 to AC-3, AC-5, AC-6

## Acceptance-criteria coverage
- AC-1: steps 1, value sourcing 1, unit and e2e · AC-2: steps 2, 3, value sourcing 4 · AC-3: steps 4 to 6, value sourcing 3 · AC-4: steps 1, 2, value sourcing 2 · AC-5: steps 7, 8 · AC-6: step 9 · AC-7: steps 6, 10, commands
