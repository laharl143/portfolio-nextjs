# Verify: landing hero motion and portrait · spec 0017 · updated 2026-11-01
_Steps derived from spec 0017 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] At 1440x900, open `/` → copy on the left (7 of 12 columns), portrait on the right (5 of 12); exactly one `h1`, text equals `landingData.hero.headline` → AC-1
- [x] At 375px, open `/` → portrait full width below the copy; LinkedIn and GitHub wrap under the button → AC-1, AC-4
- [x] Load `/` and read opacities 600ms after load → every `.brand-reveal-word` and `.brand-rise` is at opacity 1; no 3 second delay, no "Click Me!" ribbon → AC-2
- [x] Load `/` with JavaScript off → the headline, stance, and credibility lines read in full → AC-2
- [x] Change `landingData.hero.headline` locally (longer, 15 words) → the last word still finishes by about 450ms (delay capped at 150ms) → AC-2, Value sourcing (word delay)
- [x] Portrait is `eat-sleep-code.png` with a blur placeholder, a rounded token border, and alt text from `landingData.hero.portraitAlt` → AC-3, Value sourcing (image, alt)
- [x] At scroll 0 the zoom layer's transform is `none`; at 600px it is `matrix(1.12 …)`; at 1000px and beyond it holds 1.2; no layout shift, no horizontal scroll → AC-3, Value sourcing (portrait scale)
- [x] LinkedIn and GitHub sit after "Tell me about your project" in the same row; each opens in a new tab with `rel="noopener noreferrer"`, name "<Label> (opens in a new tab)", a 44px target, token colors, and a visible focus ring on Tab → AC-4, Value sourcing (hero socials)
- [x] On `/` and `/products`, the footer list "Social links" holds LinkedIn, GitHub, Codewars, MonkeyType, Facebook in that order, with `personalData` URLs, under the email link; `/personal` footer unchanged → AC-5, Value sourcing (footer socials)
- [x] From `md` up, "Scroll" plus three pulsing chevrons sit centered at the bottom of the hero, below the button (never over it, checked at 1280x800 and 1366x768), `aria-hidden`, no pointer events; they scroll away and never move or zoom on idle; hidden at 375px → AC-6, Value sourcing (scroll hint label)
- [x] Hover the hero and closing buttons → each lifts slightly, with the fill swap and arrow slide → AC-7
- [x] With reduced motion on → no word reveal, no rise, no zoom after scrolling, chevrons still at full opacity, no lift or arrow slide on hover, color change stays; no hydration warning in the console → AC-8, Value sourcing (whether to animate)
- [x] Click the hero button → `contact_click` with location `hero`; `/personal` hero, footer, and scroll indicator as before; no horizontal scroll at desktop and 375px in dark and light → AC-9

## Commands
- [x] `npm run lint` → clean → AC-10
- [x] `npm test` → all pass (incl. `LandingHero.test.tsx`, `Footer.test.tsx`, `ContactLink.test.tsx`) → AC-9, AC-10
- [x] `npm run build` → passes, leak check clean → AC-10
- [x] `npm run test:e2e` (behind a proxy set `NO_PROXY=localhost`) → all pass, incl. the `0017` cases in `e2e/landing.spec.ts` → AC-10

## Acceptance-criteria coverage
- AC-1 steps 1, 2 · AC-2 steps 3 to 5 · AC-3 steps 6, 7 · AC-4 steps 2, 8 · AC-5 step 9 · AC-6 step 10 · AC-7 step 11 · AC-8 step 12 · AC-9 step 13, `npm test` · AC-10 Commands
