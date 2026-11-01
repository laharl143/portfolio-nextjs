# 0015. ED Solutions brand: decision record

Build spec: [index.md](index.md)

## Context

> ⚠️ Premise note: the scope's done line asks for the brand "applied to the landing page shell", but `/` has no page yet (spec 0014 redirects it to `/personal`) and the landing page is feature 33. Building a placeholder `/` would put an unfinished page live. The engineer chose to build the shared pieces and apply them to the existing business pages instead, so feature 33 inherits a working brand. The done line should be read that way (see Follow-up in `index.md`).

The site is splitting in two: an employer facing portfolio at `/personal` and business facing pages for small and medium business clients (`/products`, `/contact`, and the coming `/`). Today both share one look: stone neutrals, Archivo, a few scattered accents (`red-orange` #FF5533, a neon blue, the green and red bars on the share card), and a header that reads "Erskine Duenas". Nothing identifies a business called ED Solutions, and `SITE_NAME` puts "Erskine Duenas" in every title and share card.

The engineer set the forces. The design reference is the WHOOP app (seven screenshots curated on Mobbin), used for mood only, never copied, since copying another company's marks or proprietary fonts would be both a legal and a credibility risk. `/personal` and the studio must stay fully frozen, including favicon, site name, and theme default. The brand must work in both themes, with dark as the signature. The studio, `/personal`, and the business pages share one `(site)` root layout today (spec 0003 split the studio into its own root), one `ThemeProvider` with a light default, and Next's rule that `favicon.ico` can only sit at the top of `app/` and therefore applies everywhere.

Without this decision, feature 33 would invent the look while building the page, and every later business page would copy whatever it guessed.

### Reference screenshots (evidence, not committed)

The seven screenshots show: a splash with a ring mark on pure black; a pairing success screen on a slate gradient with a green signal check and an outline pill button; a dashboard of ring gauges and slate cards with wide tracked uppercase labels; a chat surface with white pill suggestion chips; a sleep detail with a large numeral and small status bars (orange, gray, teal); a health grid of slate cards with bold numerals and small labels; and a photo hero with a thin geometric wordmark, a solid white pill primary, and an outline pill secondary. They are third party product screenshots, so they stay out of the repo. This description is the record.

## Options considered

### Option 1: Global rebrand of the shared tokens

Change the existing `:root` and `.dark` tokens, `SITE_NAME`, the favicon, and the share card for the whole site.

**Pros**:
- The least code: no new route group, no variants, one look to maintain.

**Cons**:
- Changes `/personal` and the studio, which the engineer ruled out.
- Recruiters would land on a business brand.

### Option 2: Scoped brand theme in its own route group (chosen)

Add a `.brand` token scope and put the business pages in `src/app/(site)/(brand)/`, whose layout carries the brand class, a dark theme default, the ED Solutions metadata base, and brand icons. Header and Footer get a `variant` prop.

**Pros**:
- Structure enforces the freeze: anything outside the group cannot pick up the brand by accident.
- Feature 33 drops `/` into the group and inherits everything.
- Reuses the shadcn token pattern, Archivo, and the existing components.

**Cons**:
- Moves two route folders and splits the single theme provider into three.
- Two looks to maintain, and a variant branch in Header and Footer.

### Option 3: Forked brand components and per page theming

Keep the folders where they are. Build `BrandHeader` and `BrandFooter`, and have each business page wrap itself in brand classes and set its own icons and metadata.

**Pros**:
- No folder moves, and the personal components stay untouched.

**Cons**:
- Every business page must remember the wrapper, icons, and metadata, so a forgotten one silently ships the wrong brand.
- Duplicated Header and Footer logic (menu, scroll nav, tracking) drifts over time.
- The dark default per page still needs provider changes, so it saves little.

## Rationale

Option 2 is the only option that meets the engineer's two hard constraints (a brand on business pages, and `/personal` plus the studio frozen to the favicon) without relying on every future page doing the right thing. A route group is Next's own tool for "these pages share a layout", and it costs nothing in URLs, so the sitemap, canonicals, and spec 0014 stay valid. The dark default per section forces the provider split under any option, because next-themes defers a nested provider to the outer one. Once the provider moves into group layouts anyway, the group also becomes the natural home for icons, the title template, and the token class.

Variants beat forks for Header and Footer because their behavior (menu, section scroll from spec 0014, contact tracking) must stay identical. Only the skin and the wordmark differ.

Delegated calls, each the recommended pick:
- Electric blue over signal green: it builds on the existing `neon-light` (#0096FF), reads as trust and systems to business buyers, and stays clear of WHOOP's signature green. The runner up was green. In light, the accent darkens to #0066CC to keep 4.5:1 on light surfaces.
- Archivo's width axis over a second font: it gets the wide, tracked label feel with no new download and no risk to `/personal`. The runner up was a geometric display font.
- A drawn stroke "ED" SVG favicon over a text based one: favicons render without web fonts, so text would fall back unpredictably. The runner up was an ImageResponse generated icon, which adds a route for no gain.
- A static committed apple icon PNG over a file convention `apple-icon.tsx`, which keeps every icon in `metadata.icons` with one clear override rule.
- A separate `renderBrandCard` over parameterizing `renderShareCard`, which keeps the personal card byte for byte unchanged.
- No References section, and the screenshots stay out of the repo.
