# 0016. ED Solutions landing page: decision record

Back to the build spec: [index.md](index.md)

## Context

Since spec 0014, `/` has sent every visitor to `/personal` with a temporary redirect. Spec 0015 then gave the business pages their own brand in the `(brand)` route group. The domain is still the first thing a small business owner types or is sent, and today it shows them an employer portfolio. The sales slice measures success by contact form submissions. A business owner who lands on a job seeker's page is unlikely to send one.

The landing page also sits in the middle of the sales slice. Features 34 (hero pitch), 35 (section calls to action), 38 (project outcomes), 39 (business FAQs), and 40 (Vital Stats case study) each own a piece of what the page shows, and most of them still owe a design decision. The project builds Tracer Bullet: each feature ships complete and working, with no throwaway shell. So this feature has to draw a line: what it builds now, and how the later features slot in without reworking the page.

Earlier specs left this feature some work. Spec 0014 left removing the redirect, a `home` SEO entry and root share card, and forwarding old links such as `/#hero` to `/personal` (and not reusing those ids). Spec 0015 left the brand nav and footer copy, which still say "Seeking Full-Time Employment Opportunities" and link to `/personal` sections on business pages. Both specs freeze `/personal`, the studio, and the not found page.

The design source is the current UI plus the spec 0015 brand. A Mobbin reference was wanted, but the Mobbin MCP needs a paid plan.

## Options considered

### Option 1: Frame only

Build the route, metadata, share card, nav, footer, hash forwarding, and a static hero. Every other section arrives with its own feature.

**Pros**:
- The smallest change, and no section is designed ahead of the feature that owns its content.
- No overlap with any later feature.

**Cons**:
- The page is one screen with a button for as long as 38, 39, and 40 take. That is a weak first impression on the domain, and the opposite of "benefits before features".
- "What I build", the products teaser, and the closing call to action belong to no other feature, so they would have no home.

### Option 2: Frame plus the sections no other feature owns (chosen)

Option 1, plus "What I build", a products teaser, and a closing call to action. The hero ships static with feature 34's decided copy. Later features fill reserved slots.

**Pros**:
- After this feature, the page is a complete pitch: value, benefits, proof that systems are live, and a clear next step.
- Each later feature has a named slot, id, and data file, so none of them reworks the page.
- It closes every item that specs 0014 and 0015 left for this feature.

**Cons**:
- The hero is touched twice: static now, animated in feature 34.
- There is no story or project proof until 38 and 40 ship.

### Option 3: The whole page in one go

Build every section now, and shrink 34, 38, 39, and 40 to refinements.

**Pros**:
- One build, and the full page is live sooner.

**Cons**:
- It makes decisions those features still owe (project outcomes, FAQ answers, the case study shape) without their design runs.
- It is a large change, against the Tracer Bullet approach, and the later rows would mostly rewrite what this one built.

## Rationale

Option 2 is the only one that leaves the domain doing its job (turning a visitor into an inquiry) while respecting the slice's ownership lines. Option 1 honors ownership but leaves the first impression nearly empty, and three sections the engineer wants would have no owner. Option 3 fills the page by making other features' decisions without their design runs, which the scope explicitly routes through `/architect`.

The page goes in `(brand)/page.tsx` because spec 0015 built that group for it: theme, icons, title template, and tokens come for free. The title uses `absolute` so the template does not print the brand name twice. The `(site)` layout's default title stays on the portfolio copy, against spec 0014's plan, because the only page that uses it is the not found page, which spec 0015 froze.

Old `/#section` links are forwarded by a small client component, not a server redirect, because the hash never reaches the server. `location.replace` keeps Back from returning to `/` and bouncing again. The cost is a possible one frame flash and no forwarding without JavaScript, which matches the crossover flash spec 0015 already accepted.

Structured data is an `Organization` (runner up: `ProfessionalService`, a local business type that wants an address, which a remote one person business should not publish). It links the founder to `/personal`, which ties the business and the person together for search engines without repeating the `Person` block.

The teaser shows `built` products only, because the landing page's job is proof, and "planned" products read as promises. The `/products` page keeps the full ecosystem. Calls to action are real links through one shared `ContactLink`, so they work by keyboard and without JavaScript, and every one records its location for feature 37. The `/personal` link goes in the footer because the header menu is for the client story, and a recruiter who scrolls to the bottom still finds it.
