# 0009. SEO foundation for the public site

**Date**: 2026-10-20
**Status**: Accepted

## Summary

The public site (`/` and `/products`) gets real search and sharing metadata: proper titles and descriptions, canonical links (the one official URL for a page), a generated social share card per page, a `sitemap.xml`, a `robots.txt`, and a Person profile in JSON-LD (machine readable data search engines read). Everything uses Next.js built in file conventions and the Metadata API, so there is no new dependency and nothing to run by hand. The studio stays out of search: it keeps its `noindex` tags, gains a `noindex` response header, and never appears in the sitemap.

## Requirements

**User stories**:
- As a recruiter, when someone pastes Erskine's link into LinkedIn, Slack, or X, I want a clean card with his name and role so the link looks professional and worth opening.
- As a recruiter searching his name, I want the search result to show an accurate title and description instead of "Created using NextJs".
- As Erskine, I want the private studio to stay out of search results and out of the sitemap.

**Acceptance criteria**:
- **AC-1**: `/` renders `<title>Erskine Duenas | Software Engineer and Aspiring Architect</title>` and the home description from `utils/data/seo-data.ts`. The string "Created using NextJs" appears nowhere in the public HTML.
- **AC-2**: `/products` renders `<title>Products | Erskine Duenas</title>` (through the layout's title template) and its existing description, now read from `utils/data/seo-data.ts`.
- **AC-3**: Each public page has `<link rel="canonical">` with the absolute production URL (`https://erskine.vercel.app` for `/`, `https://erskine.vercel.app/products` for `/products`), including on preview deployments.
- **AC-4**: Each public page emits `og:title`, `og:description`, `og:url` (matches the canonical), `og:type=website`, `og:site_name=Erskine Duenas`, `og:locale=en_US`, `og:image` (absolute URL), `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, plus `twitter:card=summary_large_image` and `twitter:image` (the same card). `/products` keeps `og:site_name` and `og:locale` (no lost fields from the page level override).
- **AC-5**: The URL in each page's `og:image` tag (Next adds a build hash inside a route group, e.g. `/opengraph-image-12o0cb`, so read it from the tag, never hardcode it) returns a 1200x630 PNG, generated at build time (static), showing the name, the role line, the page's own headline, and the domain. Pasting `https://erskine.vercel.app` and `https://erskine.vercel.app/products` into a share preview checker (LinkedIn Post Inspector or opengraph.xyz) shows the matching card.
- **AC-6**: `/sitemap.xml` is valid XML listing exactly two absolute URLs, `https://erskine.vercel.app` and `https://erskine.vercel.app/products`, and no `/studio` URL.
- **AC-7**: `/robots.txt` allows all crawlers, points to `https://erskine.vercel.app/sitemap.xml`, and does not mention `/studio`.
- **AC-8**: `/` contains exactly one `<script type="application/ld+json">`: a `ProfilePage` whose `mainEntity` is a `Person` with `name`, `jobTitle`, `url`, `image`, and `sameAs` (GitHub and LinkedIn only); `image` is `https://erskine.vercel.app/profile-image` and that URL returns a PNG (not a 404). It passes validator.schema.org with zero errors, and Google's Rich Results Test detects a Profile page.
- **AC-9**: The JSON-LD holds no email, phone, street address, or studio data, and every `<` character in it is replaced by its JSON unicode escape (a backslash followed by `u003c`, six characters in all), so a value containing `</script>` cannot close the script tag. Check it in the HTML source: no raw `<` appears between the script's opening and closing tags.
- **AC-10**: The studio is unchanged for crawlers: its pages keep `noindex, nofollow` meta, every `/studio/*` response (pages and route handlers such as the PDF and export routes) also carries the `X-Robots-Tag: noindex, nofollow` header, and studio pages get no share card or JSON-LD. `npm run build` (including the studio leak check) passes.
- **AC-11**: `/` and `/products` look and behave as before (no visual change), and `npm run lint` passes.

## Decision

**Chosen option**: Option 1: Next.js file conventions plus the Metadata API.

Set `metadataBase`, a title template, and shared Open Graph defaults in the site layout; add `opengraph-image.tsx` files rendered with `next/og`; add `src/app/sitemap.ts` and `src/app/robots.ts`; render the Person JSON-LD as a script tag in the home page; add one `X-Robots-Tag` header rule for `/studio` in `next.config.mjs`.

**Implementation skills**: `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: No database. Two small static sources:

| Source | Holds | Notes |
|---|---|---|
| `src/lib/site.ts` (new) | `SITE_URL = "https://erskine.vercel.app"`, `SITE_NAME = "Erskine Duenas"`, `SITE_LOCALE = "en_US"`, `PUBLIC_ROUTES = ["/", "/products"]` | Config, not content. One line to change on a custom domain. |
| `utils/data/seo-data.ts` (new) | `seo.home` and `seo.products`, each `{ title, description, cardHeadline }` | Content, per the `utils/data/` rule. Pages and cards both read it, so they never drift. |
| `utils/data/personal-data.js` (existing) | `name`, `github`, `linkedIn`, `designation` | `designation` (unused today, stale "Software Developer") becomes `"Software Engineer"` and feeds `jobTitle`. |

Copy values (drafted from the Hero copy, feature 14; edit freely before or during the build):
- `seo.home.title`: `"Erskine Duenas | Software Engineer and Aspiring Architect"` (used as the layout `title.default`, so it bypasses the template)
- `seo.home.description`: `"Erskine Duenas, software engineer at IBM. Architecting systems end to end, back-end focused and full-stack capable: Java, Spring Boot, React, and Next.js."`
- `seo.home.cardHeadline`: `"Architecting systems end to end"`
- `seo.products.title`: `"Products"` (the template adds ` | Erskine Duenas`)
- `seo.products.description`: the current string in `src/app/(site)/products/page.tsx`, moved as is
- `seo.products.cardHeadline`: `"Products for small and medium businesses"`
- Card role line (both cards): `"Software Engineer · Aspiring Software Architect"`

**State transitions**: none.

**API surface** (all public, all static at build, no auth):

| File / route | Output | Key details |
|---|---|---|
| `src/app/(site)/layout.tsx` metadata | `<head>` tags for every public page | `metadataBase: new URL(SITE_URL)`; `title: { default: seo.home.title, template: "%s \| Erskine Duenas" }`; `description: seo.home.description`; `openGraph: openGraphBase` (type, siteName, locale); `twitter: { card: "summary_large_image" }` |
| `src/app/(site)/page.tsx` metadata | home canonical and OG | `alternates.canonical: "/"`; `openGraph: { ...openGraphBase, url: "/", title, description }`; renders the JSON-LD script |
| `src/app/(site)/products/page.tsx` metadata | products tags | `title: seo.products.title`; `alternates.canonical: "/products"`; `openGraph: { ...openGraphBase, url: "/products", title, description }` |
| `src/app/(site)/opengraph-image.tsx` | `GET /opengraph-image-<hash>` → PNG 1200x630 (path chosen by Next) | exports `alt`, `size = { width: 1200, height: 630 }`, `contentType = "image/png"`; default export returns `renderShareCard(seo.home.cardHeadline)` |
| `src/app/(site)/products/opengraph-image.tsx` | `GET /products/opengraph-image-<hash>` → PNG | same shape, `seo.products.cardHeadline` |
| `src/app/(site)/profile-image/route.tsx` (new) | `GET /profile-image` → PNG 1200x630, stable path | `export const dynamic = "force-static"`; `GET` returns `renderShareCard(seo.home.cardHeadline)`; exists only so the JSON-LD `image` has a URL that does not change between builds |
| `src/lib/og-card.tsx` (new) | `renderShareCard(headline): ImageResponse` | `next/og` `ImageResponse`, inline styles and flexbox only, stone-900 background, stone-100 text, green-500 and red-500 accents (Hero colors), Next's bundled default font |
| `src/app/sitemap.ts` | `GET /sitemap.xml` | `PUBLIC_ROUTES.map(path => ({ url: new URL(path, SITE_URL).href }))`, no `lastModified`, `changeFrequency`, or `priority` |
| `src/app/robots.ts` | `GET /robots.txt` | `{ rules: { userAgent: "*", allow: "/" }, sitemap: SITE_URL + "/sitemap.xml" }` |
| `src/lib/json-ld.ts` (new) | `profilePageJsonLd()` object and `toJsonLdString(obj)` | `JSON.stringify(obj).replace(/</g, "\\u003c")` |
| `next.config.mjs` `headers()` | header on `/studio/:path*` | `X-Robots-Tag: noindex, nofollow` |

The `twitter:image` comes for free: Next fills twitter images from the Open Graph images when `twitter.images` is not set (confirmed in the installed Next 16.4.2 metadata resolver). No `twitter-image.tsx` file.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| canonical, `og:url`, sitemap URLs, JSON-LD `url` | absolute site URL | `SITE_URL` in `src/lib/site.ts` (spec decision; not an env var) |
| page titles and descriptions | per route text | `utils/data/seo-data.ts` |
| `og:site_name`, `og:locale` | `"Erskine Duenas"`, `"en_US"` | `SITE_NAME`, `SITE_LOCALE` in `src/lib/site.ts` |
| `og:image` URL, width, height, alt | card | Next file convention from `opengraph-image.tsx` exports, made absolute by `metadataBase` |
| card headline | per route | `seo.<route>.cardHeadline` |
| card name, role line, domain | static | `personalData.name`, role line constant in `src/lib/og-card.tsx`, host of `SITE_URL` |
| JSON-LD `name` | `"Erskine Duenas"` | `personalData.name` |
| JSON-LD `jobTitle` | `"Software Engineer"` | `personalData.designation` (updated value) |
| JSON-LD `image` | absolute image URL | `${SITE_URL}/profile-image` (the home card from a stable route handler; the `opengraph-image` path carries a build hash, so it cannot be used; there is no real headshot yet, see Follow-up) |
| JSON-LD `sameAs` | two profile URLs | `personalData.github`, `personalData.linkedIn` |
| sitemap entries | the public route list | `PUBLIC_ROUTES` in `src/lib/site.ts` |
| studio header | `noindex, nofollow` | literal in `next.config.mjs` |

**Key invariants**:
- A page level `openGraph` object replaces the layout's whole `openGraph` (Next merges metadata shallowly), so every page that sets `openGraph` spreads `openGraphBase` first.
- `PUBLIC_ROUTES` is the only source for the sitemap. A new public route is added there and gets its own canonical; a `/studio` path never goes in it.
- The JSON-LD exposes only `name`, `jobTitle`, `url`, `image`, `sameAs`. No `worksFor` (your call, so it does not go stale on a job change), no email, phone, or address.
- Public code (`src/lib/site.ts`, `src/lib/og-card.tsx`, `src/lib/json-ld.ts`, `utils/data/seo-data.ts`) never imports from `src/studio/`, and nothing uses a `NEXT_PUBLIC_` variable.
- `robots.txt` never disallows `/studio`: a disallow would stop crawlers from seeing the `noindex`, and a linked URL could then be indexed without content. `noindex` meta plus the header is the correct way to keep it out.
- All new metadata routes, OG images, and `/profile-image` stay static (no request data, no `headers()` or `cookies()`).
- Nothing hardcodes an `opengraph-image` URL: Next appends a build hash to it inside a route group. Code that needs a fixed image URL uses `/profile-image`.

**Security model**: Everything added is public by design and contains only data already shown on the site. Not added: phone, street address, email in machine readable form. The studio gains defense in depth (the header covers non HTML studio responses that meta tags cannot). Vercel already sends `X-Robots-Tag: noindex` on preview deployment URLs, so previews stay out of search; their canonicals point at production.

**Configuration required**: none (no new env vars; `SITE_URL` is a code constant).

**Critical test scenarios**:
- Happy path: view source on `/` and `/products` shows the title, description, canonical, OG, and Twitter tags; the card URLs return PNGs; a share preview checker shows the right card for each, verifies **AC-1** to **AC-5**.
- Sitemap and robots: `/sitemap.xml` has exactly the two URLs, `/robots.txt` points to it, neither mentions `/studio`, verifies **AC-6**, **AC-7**.
- Structured data: paste the deployed `/` into validator.schema.org and the Rich Results Test, zero errors and a Profile page detected, verifies **AC-8**, **AC-9**.
- Failure case: `/products` sets its own `openGraph`; check `og:site_name` and `og:locale` are still present (catches the shallow merge trap), verifies **AC-4**.
- Studio exclusion: `curl -I` a studio page and the contract PDF route shows `X-Robots-Tag: noindex, nofollow`; `npm run build` passes the leak check, verifies **AC-10**.

## Build plan

Tracer Bullet: the first slice takes the home page through every layer (config, metadata, card, crawler files, structured data) end to end, then `/products` reuses each piece.

1. Add `src/lib/site.ts` and `utils/data/seo-data.ts` with the values above; update `personalData.designation` to `"Software Engineer"`, satisfies **AC-1**, **AC-3**
2. Site layout metadata: `metadataBase`, title default and template, description, `openGraphBase`, `twitter.card`; home page metadata with canonical and OG, satisfies **AC-1**, **AC-3**, **AC-4**
3. `src/lib/og-card.tsx` plus `src/app/(site)/opengraph-image.tsx`; confirm the PNG at the `og:image` URL and the `og:image` and `twitter:image` tags, satisfies **AC-4**, **AC-5**
4. `src/app/sitemap.ts` and `src/app/robots.ts` from `PUBLIC_ROUTES` and `SITE_URL`, satisfies **AC-6**, **AC-7**
5. `src/app/(site)/profile-image/route.tsx`, `src/lib/json-ld.ts`, and the script tag in `src/app/(site)/page.tsx`; confirm `/profile-image` returns a PNG, satisfies **AC-8**, **AC-9**
6. `/products`: move its description into `seo-data.ts`, add title, canonical, OG with `openGraphBase`, and `src/app/(site)/products/opengraph-image.tsx`, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
7. `next.config.mjs` `headers()` rule for `/studio/:path*`, satisfies **AC-10**
8. `npm run lint` and `npm run build`; check `/` and `/products` render unchanged; deploy and run the share preview and structured data checks in `verify.md`, satisfies **AC-5**, **AC-8**, **AC-10**, **AC-11**

## Consequences

**Positive**:
- Shared links show a branded card, search results show real copy, and Google can tie your GitHub and LinkedIn to you.
- No new dependency, no env var, no runtime cost: everything is static at build.
- One public route list feeds the sitemap, so the studio cannot slip in by accident.

**Negative / tradeoffs**:
- The cards use Next's bundled default font, not Archivo, so they are close to the site's look but not identical.
- `SITE_URL` is hardcoded; a custom domain (the deferred ED Solutions rebrand) needs a one line change, and forgetting it leaves canonicals on the old domain.
- The JSON-LD `image` is the share card, not a photo of you; it validates but is weaker than a real headshot.
- Social platforms cache cards; after a copy change you may need LinkedIn Post Inspector to refresh it.

**Neutral**:
- Next adds `noindex` to the 404 page on its own; `not-found.tsx` needs no change.
- The `X-Robots-Tag` header also applies when the studio is off (it 404s), which is harmless.

## Follow-up

- [ ] Add a real headshot to `public/`, point the JSON-LD `image` at it, and delete the `profile-image` route.
- [ ] If you move to a custom domain, update `SITE_URL` in `src/lib/site.ts` and add the domain in Google Search Console.
- [ ] Optional: submit the sitemap in Google Search Console after deploy (needs your Google account, not part of the build).
- [ ] Optional: load the Archivo font file into `ImageResponse` so the cards match the site font exactly.
