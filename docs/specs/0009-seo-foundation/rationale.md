# 0009. SEO foundation: rationale

## Context

The portfolio is a job hunting site, so most first visits start from a shared link or a name search. Today the site layout ships `title: "Erskine Duenas"` and `description: "Created using NextJs"`, with no `metadataBase`, no canonical links, no Open Graph image, no sitemap, no robots file, and no structured data. A shared link renders as a bare URL or a generic preview, and search engines get a placeholder description.

Forces: the stack is Next 16 App Router with two route groups, each with its own root layout. Only `/` and `/products` are public; the studio under `/studio` must stay out of search (spec 0003, AC-4) and every studio page already sends `noindex, nofollow` meta. The site is hosted on Vercel at `https://erskine.vercel.app`, with preview deployments on other hostnames. Public code may not import studio code or use `NEXT_PUBLIC_` variables, and content lives in `utils/data/`. The project runs at Alpha rigor, so the solution should be small and need no upkeep.

## Options considered

### Option 1: Next.js file conventions plus the Metadata API

Use `metadata` exports, `opengraph-image.tsx` rendered with `next/og`, `sitemap.ts`, `robots.ts`, and a JSON-LD script tag in the page.

**Pros**:
- Built into Next, nothing to install, static at build.
- Card text comes from the same data as the page, so it never drifts.

**Cons**:
- `ImageResponse` supports only a CSS subset (flexbox, inline styles), and custom fonts need a font file loaded by hand.

### Option 2: Static assets by hand

A hand designed PNG per page, a hand written `public/sitemap.xml` and `public/robots.txt`.

**Pros**:
- Full visual control over the card; zero code.

**Cons**:
- Every copy change or new route means editing files by hand; the sitemap goes stale silently.

### Option 3: A third party SEO package

A package such as `next-seo` or `next-sitemap`.

**Pros**:
- Familiar API for people who used it in the Pages Router era.

**Cons**:
- Duplicates what the App Router Metadata API now does natively; one more dependency to keep current.

## Rationale

Option 1 fits every force: it is native to the Next 16 App Router the site already uses, adds no dependency or env var, and keeps all output static. Generated cards read from `utils/data/seo-data.ts`, which also feeds the page metadata, so the "Done when" of feature 15 holds without manual upkeep.

Smaller calls made with the engineer's go-ahead (recommended picks): `SITE_URL` is a code constant rather than an env var (runner up: Vercel's `VERCEL_PROJECT_PRODUCTION_URL`), because previews should point canonicals at production and there is only one domain. The structured data is a `ProfilePage` wrapping the `Person` (runner up: a bare `Person`), because Google's Rich Results Test only recognizes the profile page type while schema.org validators accept both. `robots.txt` does not disallow `/studio` (runner up: disallow it), because blocking crawling hides the `noindex` tag. The engineer chose the Person fields directly: core fields plus `sameAs`, no `worksFor`.
