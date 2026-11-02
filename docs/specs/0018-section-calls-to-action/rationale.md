# 0018. Section calls to action: rationale

The decision record behind [index.md](index.md).

## Context

Spec 0016 shipped the ED Solutions landing page with four sections: hero (`#pitch`), "What I build" (`#services`), Products (`#ecosystem`), and the closing call to action (`#start`). Only the hero and the closing section link to `/contact`. A visitor who is convinced halfway down the page, after reading the service cards or seeing products already running, has to scroll to the bottom or back to the top to act. The scope measures this slice by contact form submissions, so every dead end costs.

Spec 0016 already set the pattern for this: every landing call to action goes through `src/components/brand/ContactLink.tsx`, a real `<a href="/contact">` that records a Vercel Analytics `contact_click` event with a `location` (a short name for where the click came from). Today `ContactLink` only has the filled pill look, and `ContactLocation` in `src/lib/analytics.ts` only lists `hero`, `closing`, `header`, `mobile_nav`, and `footer`.

Two forces pull against each other. More calls to action give more chances to convert. But four identical loud buttons on one page compete for attention, which waters down the main ones. The Products section also already ends on a "See every product" link, so a new link there has to sit beside it without confusing the reader.

Features 38 (selected work, `#work`), 39 (business FAQs, `#questions`), and 40 (case study, `#story`) will add sections later. Feature 37 (inquiry conversion tracking) will read these `location` values to trace an inquiry back to the call to action that led to `/contact`, so the location names need to be stable and predictable.

## Options considered

### Option 1: Quiet text variant on `ContactLink` (chosen)

Add an optional `variant` prop to `ContactLink` (`"pill"`, the default, or `"text"`). The text variant is an underlined link with the arrow, styled like the existing "See every product" link. Services gets one at its end; Products gets one in a shared row with "See every product".

**Pros**:
- One component still owns every landing call to action and its tracking, as spec 0016 set.
- Clear hierarchy: the hero and closing pills stay the strong asks, the section links are a soft nudge.
- Matches the link style the Products section already uses.

**Cons**:
- A text link is easier to skim past than a button, so each one may convert less than a pill would.
- `ContactLink` grows a second look to keep up.

### Option 2: Outline pill (`pill-outline`) at each section end

Reuse the existing `pill-outline` button style through `ContactLink`.

**Pros**:
- Clearly a button, more visible than a text link.
- The style already exists in `buttonClassName`.

**Cons**:
- Four pill shaped buttons down one page still read as repetition.
- Beside "See every product" (a text link), the outline pill would outrank the hero's own message in that section.

### Option 3: The same filled pill everywhere

Drop `<ContactLink location="…" />` into each section as is.

**Pros**:
- No component change at all.

**Cons**:
- Four identical loud buttons compete with each other and with the section content; the page starts to feel pushy, which works against the "simple message" sales rule in the scope.

## Rationale

The scope's goal is contact submissions, but the same scope asks for "a simple message" and "a clear path to `/contact`". A clear path means one obvious strong ask, not four. The quiet text link gives a next step at the moment a reader is convinced, while the hero and closing pills keep their weight. The outline pill was the runner up: it is more visible, but beside the existing "See every product" text link it would dominate the Products section.

Keeping one label everywhere keeps the message simple and costs nothing in accessibility. WCAG link purpose allows the same link text for the same destination, and every instance goes to `/contact`. Per section wording would add copy to maintain and split the message.

Location names follow section ids (`services`, `ecosystem`) so feature 37 can map an inquiry back to a section without a lookup table, and so features 38 to 40 need no new naming decision (`work`, `questions`, `story`). The existing `hero` name stays even though its section id is `pitch`, because renaming it would break the event history already in Vercel Analytics.

Contact comes first in the Products row because the page's job is the inquiry; "See every product" is the secondary path for readers who want more proof.
