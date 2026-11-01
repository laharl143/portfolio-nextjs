# Verify: ED Solutions rebrand · spec 0015 · updated 2026-11-01
_Steps derived from spec 0015 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] With no saved theme, open `/contact` and `/products` → dark slate gradient, `ED SOLUTIONS` wordmark where the name, `ED` badge, and title toggle were; no "Erskine Duenas" in the header → AC-2, AC-3
- [x] Toggle to light on `/products` → light surface, including overscroll and the area below short content → AC-2
- [x] Check desktop, 768px, and 375px in both themes → wordmark clears the menu button, no horizontal scroll → AC-2
- [x] Product status badges, product section labels ("Sends to"), and form field labels use the wide uppercase brand label; headings use the brand heading → AC-2
- [x] Footer on brand pages uses the card color and pill outline buttons; footer copy unchanged → AC-2
- [x] Inspect the brand subtree for `stone-*`, `white`, `black`, `neon-*`, `red-orange-*` color classes → only the header blend bar's `text-white` remains; green status, red errors, and the pulse dot unchanged → AC-2b
- [x] Header blend bar: wordmark stays readable at the top and while scrolling over cards, both themes (at least 3:1) → AC-2
- [x] Click the wordmark on a brand page → goes to `/` and lands on `/personal` → AC-2
- [x] No saved theme: load `/personal` (light), click the footer Contact Me → `/contact` is dark; click the wordmark → `/personal` is light → AC-3
- [x] On `/products`, pick light, then client navigate to `/personal` and then `/contact` → all light; reload → still light → AC-3
- [x] Set `localStorage.theme = "system"`, load `/contact` → dark → AC-3
- [x] Full page loads of each page show no flash of the wrong theme → AC-3
- [x] Compare `/personal` and `/studio/login` against the pre-build baselines (desktop and 375px, both themes) → no change other than running animations → AC-7, AC-8
- [x] `/does-not-exist` → 404, same default page as before → AC-9

## Value sourcing
- [ ] Change `brandData.name` locally → header wordmark and card wordmark follow it → wordmark source
- [ ] Change `brandData.tagline` locally → the brand card tagline follows it → tagline source
- [ ] Change `seo.contact.cardHeadline` locally → the `/contact` card headline and `og:image:alt` follow it → headline and alt source
- [x] `/products` title is `seo.products.title` plus ` | ED Solutions` from the `(brand)` template → title source
- [x] `og:site_name` is `ED Solutions` on brand pages and `Erskine Duenas` on `/personal` → site name sources
- [x] First visit theme differs by group (dark brand, light personal and studio); after a pick, the one shared `theme` key wins everywhere → theme sources
- [x] Each page's icon links come from its group layout: brand SVG plus apple icon on brand pages, `/icons/erskine-duenas.ico` elsewhere → icon sources

## Commands
- [x] `npm run lint` → clean → AC-10
- [x] `npm test` → all pass, including `src/lib/brand.test.ts` → AC-4, AC-6, AC-10
- [x] `npm run build` → passes, leak check clean → AC-10
- [x] `npm run test:e2e` → all pass, including `e2e/brand.spec.ts` (titles, site names, icons, card size, theme defaults, crossover, stale `system`, freeze, 404) → AC-3 to AC-10
- [x] Contrast from the token values: `foreground`, `muted-foreground`, and `signal` on `background`, `card`, and both surface stops, both themes → each at least 4.5:1 (lowest measured 4.74) → AC-1
- [x] `curl /favicon.ico` and `/icons/erskine-duenas.ico` → byte identical to the old icon (md5 `e93a87a55a963b3ca7ff83426fd859c0`) → AC-7

## Acceptance-criteria coverage
- AC-1: contrast command · AC-2: UI steps 1 to 5, 7, 8 · AC-2b: UI step 6 · AC-3: UI steps 9 to 12, e2e · AC-4: unit and e2e, value sourcing · AC-5: e2e card checks, tagline and headline steps · AC-6: e2e icon checks · AC-7: baseline step, favicon command, e2e · AC-8: baseline step, e2e · AC-9: 404 step, e2e · AC-10: commands
