# 0014. Move the portfolio home page to `/personal`: rationale

## Context

The site is being split in two (scope slice "Sales slice: Client positioning"). Employers need the current portfolio as it is, CV download included. Small business clients need a new ED Solutions landing page at `/`. Both pages cannot live at `/`, so the portfolio has to move first, without breaking the links people already have: the bare domain, `/#projects` style section links in the header and footer, links in your CV and on LinkedIn, and the search and share setup from spec 0009.

The landing page is several features away (rebrand 37, landing page 38). In the meantime, `/` must not show a blank page or a half built landing page. Feature 38 also needs a clear handover: which of the things this spec adds it must undo or keep.

Everything here is routing and metadata on the existing Next 16 App Router site. It adds no dependency, no data, and no studio change.

## Options considered

1. **Move plus a temporary config redirect (chosen).** One commit, reverted by one revert. A 307 tells search engines the move is temporary, so `/` keeps its place in search until feature 33 puts the landing page there.
2. **Keep the portfolio rendering at both `/` and `/personal`**, with `/` canonical to `/personal`. No redirect, but it is a duplicate page, and feature 33 would have to find and remove it. It also confuses which URL people share.
3. **Wait and ship together with feature 33.** Nothing to design for the meantime, but it ties a small, safe move to the biggest feature in the slice and blocks feature 32's `/personal` decision from being checked live.

## Rationale

A config redirect is the smallest change that keeps every old link working. Browsers keep the `#section` part across a redirect, so `/#projects` reaches `/personal#projects` with no script. It is also the easiest to remove: feature 33 deletes one redirect entry and adds a page. A temporary redirect is chosen over a permanent one (308) because `/` is coming back as a real page. A permanent redirect is cached by browsers and would keep sending returning visitors to `/personal` after the landing page ships.

The section links point straight at `/personal#…` instead of relying on the redirect. That way they keep working once `/` becomes the landing page, and `scrollToSectionIfSamePage` needs no change (it already compares paths). The logo and 404 links keep `/`, because their meaning is "site home", which is about to become the landing page.

The `home` SEO copy entry is renamed `personal` rather than copied, so there is one source of the portfolio copy. Feature 38 adds a new `home` entry for the landing page and points the layout defaults at it.
