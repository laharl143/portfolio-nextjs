# 0018. Section calls to action on the landing page

**Date**: 2026-11-02
**Status**: Accepted

## Summary

The landing page at `/` gets a short "Tell me about your project" link to `/contact` at the end of the "What I build" and Products sections, so every part of the page offers a next step. The new links are quiet underlined text links (a new `text` look on the existing `ContactLink`), so the hero and closing pills stay the main buttons. Each click records which section it came from (`services` or `ecosystem`), and later sections (features 38, 39, 40) follow the same rule when they ship.

## Requirements

**User stories**:
- As a small business owner reading the landing page, I want a way to reach out at the end of the section that convinced me, so that I don't have to hunt for the contact button.
- As the site owner, I want each click to record which section it came from, so that I can see which parts of the page bring in inquiries.

**Acceptance criteria**:
- **AC-1**: `#services` ends, after its three cards, with a link (role `link`) named exactly "Tell me about your project" that goes to `/contact`. Clicking it records `contact_click` with location `services`.
- **AC-2**: `#ecosystem` ends with one row holding two links, in this DOM and visual order: first "Tell me about your project" to `/contact` (records `contact_click` with location `ecosystem`), then "See every product" to `/products`. The row sits after the product list, or after the intro when no product is `built`; both links still render in that empty case.
- **AC-3**: The two new links use the quiet text look: no filled or outlined pill (no `rounded-full`, no `bg-primary`, no border), the label underlined, the same arrow icon as the pill, colors from brand tokens only (the spec 0015 AC-2b rule), and on hover the text turns `text-signal` and the arrow slides. Under reduced motion the arrow does not slide; the color change stays. The hero and closing links keep the filled pill, unchanged.
- **AC-4**: `ContactLocation` in `src/lib/analytics.ts` adds `services` and `ecosystem`. The existing values (`hero`, `closing`, `header`, `mobile_nav`, `footer`) keep their names. A section call to action uses its section id as its location.
- **AC-5**: Both new links are real `<a href="/contact">` elements, so they work with JavaScript off. Each is reachable by Tab in reading order (on Products: the contact link, then "See every product") and shows the visible `ring-ring` focus ring. The accessible name is exactly "Tell me about your project" (the arrow stays `aria-hidden`).
- **AC-6**: At desktop and 375px, in both themes, `/` has no horizontal scroll. On Products the two links sit side by side when they fit and wrap onto separate lines at 375px, with a clear gap between them. Each new link is at least 24px tall to tap.
- **AC-7**: Nothing else changes. The hero, closing section, header, and footer on `/`, plus `/personal`, `/products`, `/contact`, and the studio, look and behave as before. The existing ContactLink, LandingHero, ProductsTeaser, and landing e2e tests still pass (update only where they must account for the new link). `npm run lint`, `npm test`, `npm run build` (with the studio leak check), and `npm run test:e2e` pass.

## Decision

**Chosen option**: Option 1: Quiet text variant on `ContactLink`

Add a `text` variant to `ContactLink`, place it at the end of `#services` and in a shared row (contact first) at the end of `#ecosystem`, with locations named after the section ids.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`)

**Choices made by delegation** (2026-11-02: the engineer picked the quiet text look, the same label everywhere, and contact first in the Products row, then asked for the recommended option on every remaining dimension): adding to Services and Products now and leaving later sections to their own features; location names equal to section ids; keeping `hero` and `closing` names as they are; no section specific copy; no new analytics event.

## Feature design

**Data model sketch**: none. No database, no stored state.

**Interface surface** (components and types; there is no API):

| Piece | Change |
|---|---|
| `src/lib/analytics.ts` | `ContactLocation` adds `"services"` and `"ecosystem"`. `trackContactClick` is unchanged. |
| `src/components/brand/ContactLink.tsx` | New optional prop `variant?: "pill" \| "text"`, default `"pill"` (today's look, unchanged). `"text"` renders the same `<Link href="/contact" onClick={() => trackContactClick(location)}>` with the label and the two arrow sliding icon, but classes `group/button inline-flex items-center gap-2 rounded-sm py-1 text-left underline underline-offset-4 transition-colors hover:text-signal ${focusRing}` instead of `buttonClassName("pill", …)`. `group/button` keeps the existing arrow slide hook; the existing `motion-reduce` classes keep it still under reduced motion. `className` still appends. |
| `src/sections/Services.tsx` | After the cards `<ul>`: `<ContactLink location="services" variant="text" className="mt-10" />`. Stays a server component. |
| `src/sections/ProductsTeaser.tsx` | Replace the lone "See every product" link with `<div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">` holding `<ContactLink location="ecosystem" variant="text" />` then the existing `/products` `<Link>` (drop its own `mt-10` and `inline-block`, keep its other classes). Renders whether or not the list does. |
| `utils/data/landing-data.ts` | No change; the label stays `landingData.ctaLabel`. |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render section link | Label "Tell me about your project" | `landingData.ctaLabel` |
| Render section link | Destination `/contact` | fixed `href` in `ContactLink` |
| Render section link | Look (pill or text) | the `variant` prop at the call site (`text` in Services and ProductsTeaser) |
| Click section link | `contact_click` `location` | the `location` prop at the call site, equal to the section id (`services`, `ecosystem`) |
| Render Products row | "See every product" label and `/products` | `landingData.ecosystem.linkLabel`, fixed `href` (unchanged) |

**Key invariants**:
- Every call to action to `/contact` on the landing page goes through `ContactLink`, so it always records a `location` (spec 0016, kept).
- A section call to action's `location` equals its section id. Features 38, 39, and 40 add `work`, `questions`, and `story` to `ContactLocation` when they ship a section call to action.
- Existing `ContactLocation` values are never renamed (analytics history).
- The hero and closing calls to action stay the only filled pills on `/`.

**Security model**: public page, no user data. The analytics event carries only the fixed `location` string, no personal data.

**Configuration required**: none.

**Failure and edge cases**:
- **No `built` product**: the Products list is absent, the link row still renders with both links (AC-2).
- **Analytics blocked or JavaScript off**: the link still navigates to `/contact`; only the event is lost (spec 0016 behavior).
- **Narrow screens**: the Products row wraps (`flex-wrap`), and the label can wrap inside the text link without overflow (`text-left`, no fixed height) (AC-6).

**Critical test scenarios**:
- Unit, `ContactLink`: for `services` and `ecosystem`, the link goes to `/contact` and a click calls `track("contact_click", { location })` (mocked `@vercel/analytics`). With `variant="text"` it has no `rounded-full` or `bg-primary` class; with no variant it still has the pill classes. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- Unit, `ProductsTeaser`: the contact link comes before "See every product" in the DOM, and with an empty product list both links still render and no `<ul>` is left. Verifies **AC-2**.
- Unit, `Services`: renders the link to `/contact` after the cards. Verifies **AC-1**.
- e2e, `e2e/landing.spec.ts`: inside `#services` and `#ecosystem`, the link named "Tell me about your project" has `href="/contact"` and clicking the `#services` one lands on `/contact`. Tab from the last service card reaches the services link; in `#ecosystem` Tab reaches the contact link before "See every product", each with a visible focus ring. Verifies **AC-1**, **AC-2**, **AC-5**.
- e2e layout: no horizontal scroll at desktop and 375px in both themes; the hero and closing links still carry the pill look. Verifies **AC-6**, **AC-3**, **AC-7**.

## Build plan

Tracer Bullet: one thin thread first (type, variant, one section, end to end through the browser and the event), then the second section, then the checks.

1. Add `services` and `ecosystem` to `ContactLocation`; add the `variant` prop and the `text` look to `ContactLink`; place it at the end of `Services`; extend the `ContactLink` unit test. Satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**
2. Add the shared link row to `ProductsTeaser` (contact first, then "See every product"), with the empty list case; extend the `ProductsTeaser` unit test. Satisfies **AC-2**, **AC-5**
3. Checks: landing e2e for both sections (href, click, Tab order, focus ring, no horizontal scroll at desktop and 375px), the hero and closing look unchanged, browser pass in both themes, then lint, unit tests, build, and e2e. Satisfies **AC-5**, **AC-6**, **AC-7**

## Consequences

**Positive**:
- Every landing section that makes a point now ends with a way to act on it.
- Feature 37 gets stable, predictable `location` values to trace inquiries by.
- Later sections reuse the same component and naming rule, with no new decision.

**Negative / tradeoffs**:
- A text link is quieter than a button, so each section link may convert less than a pill would; if analytics show near zero clicks, revisit the look.
- The page now repeats the same link text four times; screen reader users listing links hear it four times (allowed, since all go to the same place, but a little repetitive).
- `ContactLink` now carries two looks to maintain.

**Neutral**:
- The `hero` location keeps a name that does not match its section id (`pitch`), a documented exception to the naming rule.
- No migration, no environment variables, no new dependency.

## Follow-up

- [ ] Features 38, 39, and 40: when each adds its landing section, end it with `<ContactLink location="<section id>" variant="text" />` and add that id to `ContactLocation`, unless that feature's own spec decides otherwise.
- [ ] Feature 37: read `location` values from this spec's naming rule when tracing inquiries back to a call to action.

Decision history (context, options considered, rationale) lives in [rationale.md](rationale.md). Verify steps live in [verify.md](verify.md).
