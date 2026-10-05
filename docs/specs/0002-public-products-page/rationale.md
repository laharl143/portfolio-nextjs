# 0002. Public Products page from a static, public only data file: rationale

## Context

You keep your product plan in a private Claude artifact, the "SMB Systems Map": 15 systems and 21 connections. Each system has private fields (notes, lessons, stack, repo links) next to the parts that are safe to show. You want visitors to see the ecosystem, but the private fields must never reach the public site. Some summaries also mention a real client or read like notes to yourself, so they need a public rewrite. RoomPOS in particular mirrors a real client's architecture and must be described generically.

The site is a Next.js 14 App Router app with one route today (`/`). The header's menu uses in page anchors (`#projects`, `#faqs`, …) and a click handler that scrolls within the current document, so a second route needs those links to point back to the home page. There is no database, no API, and no secret in the project, and the private studio (features 19 to 24) does not exist yet. Feature 24 will later move the full map into the studio, so whatever this page reads now should be easy to feed from there later.

If this is not decided, the risk is a page that leaks private fields (for example a build step that pulls the whole artifact) or a page blocked until the studio exists.

## Options considered

### Option 1: Static, typed, public only data file in the repo

A TypeScript file in `utils/data/` holds the 15 products and 21 links with only the public fields, and summaries rewritten for the public. The page imports it at build time.

**Pros**:
- Private fields never enter the repo, so they cannot leak through a bug, a cache, or a bundle.
- No tokens, no network, no new dependency; the page prerenders as plain static HTML.
- A TypeScript type rejects any extra field (like `notes`) at compile time.

**Cons**:
- Manual sync: when the map changes, you edit the file by hand, so it can drift.

### Option 2: Fetch from the artifact at build time

A build script reads the artifact database, strips private fields, and writes the data the page uses.

**Pros**:
- Always matches the map on each deploy.

**Cons**:
- There is no public API for the artifact database; the build would need a personal token as a secret on the host.
- The full private record passes through the build, so one wrong filter leaks notes or repo links.
- Summaries still need a public rewrite, which a filter cannot do.

### Option 3: Read live from the studio (feature 24)

Wait for the private studio and have the page read its public fields.

**Pros**:
- One source of truth for public and private views.

**Cons**:
- Blocks this feature behind features 19 to 24.
- Couples the public site to a private database at runtime.

## Rationale

The deciding force is privacy. Your rule is that notes, private repo links, and client names never appear publicly. The only design where that is guaranteed rather than enforced by a filter is one where the private data never enters the public repo. Option 1 does that. Option 2 routes the full private record through every build and needs a token as a secret, adding a leak path and a credential to a site that has neither today. Option 3 is the right long term shape, but it blocks a small public win behind the whole studio.

Manual sync is a real cost, but a small one. The map changes slowly (status moves a few times a month), there are 15 rows, and the summaries need human rewriting anyway. When the private systems map lands in the studio (feature 24), that feature can replace this file with a generated export that uses the same types. The page will not change.

Other calls made with this decision (the engineer asked for the recommended pick on each):
- **Own route `/products`** over a home page section: it gets its own title, a shareable URL, and keeps the home page lean. Runner up: a home teaser plus the full page.
- **Grouped by status** over by architecture layer: it shows momentum, which is what a visitor cares about. The layer (`group`) field is left out of the public data. Runner up: by layer with status badges.
- **Connections as text on each card** over a diagram: it is accessible, works on phones, needs no dependency, and stays correct when the data changes. Runner up: a hand drawn SVG diagram, which would need redrawing on every change.
- **Server component, no animation**: the page has no interactive state, so it renders on the server with zero client JavaScript of its own. Runner up: Framer Motion reveal animations, which would add client code for no information gain.
- **Design source is the current UI**: reuse the stone palette, the `section` and `container` classes, the dotted border card style from `Projects.tsx`, and the `neon-500` accent. No new design tokens.
- **Header links become route aware**: section links change from `#id` to `/#id`, a `Products` item is added, and the mobile menu handler smooth scrolls only when the link targets the current page. Otherwise it closes the menu and lets the browser navigate. Runner up: a separate header for `/products`, which would duplicate the header.
- **No outbound links**: no repo links and no live site links on this page. Vital Stats is already linked from the Projects section.
- **Privacy check at verify time** (a text search of the built output for private strings) rather than a new build script: the type already blocks the fields, and a build hook adds tooling for a solo project at the Alpha tier.
