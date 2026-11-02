# 0017. Landing hero motion, portrait, and socials: rationale

## Context

Spec 0016 shipped the landing hero static on purpose, and kept this second touch for feature 34. A paused `/architect` run on 2026-10-23 had already settled what goes in: a word reveal under 0.5s (with no 3 second delay and no "Click Me!" ribbon), a portrait that zooms on scroll, a scroll hint without the idle zoom, a hover on the button, LinkedIn and GitHub in the hero, all five socials in the footer, and everything still under reduced motion. Three things were still owed: which image to use and where it sits on the dark brand page, where the links go, and how to build the reveal.

The `/personal` hero already does most of this, but in a way that does not fit the landing page. Its reveal (`useTextRevealAnimation`: SplitType plus `motion`) hides the words until client JavaScript runs, then staggers them at 0.15s per word. Its supporting lines wait 3 seconds. Its portrait grows from 100% to 240% width inside a sticky block with a 200vh scroll runway. Its socials use platform hex colors on hover. And nothing on the site handles `prefers-reduced-motion` yet.

The landing page sells to small business owners, and its first job is to land the headline at once. Brand pages use token colors only (spec 0015). The repo has three candidate images: `eat-sleep-code.png` (your real photo, from behind, used on `/personal`), `ers-1-image.png` (illustrated art of a developer at a desk), and `hero-image.jpg` (not used, and not clearly you).

## Options considered

### Reveal: CSS only, words split on the server (chosen)

Word spans are rendered in JSX, and CSS keyframes run the reveal with a capped stagger.

**Pros**: the text is in the HTML and the animation runs from first paint, with no wait for hydration; the hero stays a server component; reduced motion is one media query; it works with JS off.
**Cons**: it adds new CSS next to an existing hook; and the per word stagger is fixed in CSS rather than driven from JS.

### Reveal: reuse `useTextRevealAnimation`

Keep SplitType plus `motion`, with the stagger cut to fit 0.5s.

**Pros**: reuses a working hook, and both pages animate the same way.
**Cons**: the words stay hidden until the client bundle loads and runs, so on a slow phone the full message can land well past a second, which breaks the "reads within about a second" goal. It also makes the hero a client component.

### Zoom: page scroll scale inside a fixed frame (chosen)

**Pros**: no layout change, no extra scroll runway, no overlap with the copy; scroll 0 means scale 1, so there is no jump at hydration.
**Cons**: less dramatic than `/personal`; on phones, part of the zoom has run before the portrait comes into view.

### Zoom: `/personal`'s width growth in a sticky runway

**Pros**: a bold effect, with code to copy.
**Cons**: it adds 200vh of empty scroll before "What I build", spills over the copy column, and animates `width` (layout work on every frame).

### Portrait: `eat-sleep-code.png` (chosen) vs a new headshot vs `ers-1-image.png`

The real photo works today and suits the dark page. A front facing headshot would build more trust, but the build would wait on a file. The illustrated image reads as generated art and does not show you, which undercuts "a real developer is here".

## Rationale

The force that decides this is the landing page's job: a business owner should read the whole pitch within about a second. Any reveal that depends on client JavaScript puts hydration time between them and the headline, and that time is longest on the cheap phones many small business owners use. A CSS reveal on server rendered spans removes that dependency entirely, and reduced motion becomes a simple media query, the first reduced motion support on the site. The cost is a few lines of CSS that do not reuse the existing hook, which is fine: that hook stays on `/personal`, where the slower reveal is part of the personal feel.

The zoom follows the same thinking. A transform inside an `overflow: hidden` frame cannot cause layout shift, needs no sticky runway that would push the services section down, and starts at scale 1 at scroll 0, so the server render and the client match. Only that one component needs to be client code.

The remaining picks follow the project's rules: token colors only on brand pages, and one data source (`brandData.socials`, built from `personalData`) for both the hero and the footer. Social click tracking is left to feature 37, which owns the conversion story, so the links stay plain server rendered anchors. You delegated these smaller choices on 2026-11-01, and each one records its runner up in the spec's Decision table.
