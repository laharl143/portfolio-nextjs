# Verify: Certifications curation · scope feature 13 · updated 2026-09-18

_Steps derived from the feature's "Done when" line (no formal spec; small, pre-agreed UI change). `/check verify` runs these._

## UI / manual

- [ ] Load the site, scroll to Certifications & Badges with "All" filter active → only 4 featured credentials render (IBM Generative & Agentic AI Developer, AWS Partner: Agentic AI Essentials, AWS Partner: Generative AI Essentials, Oracle Cloud Infrastructure 2025 Certified AI Foundations Associate)
- [ ] Click "Show all 23 credentials" → all 23 credentials render, plus 1 "More coming soon" placeholder card (23 mod 4 = 3 remainder); button label flips to "Show featured only"
- [ ] Click "Show featured only" → returns to the 4-item curated view
- [ ] With curated view active, click an issuer filter (e.g. "IBM") → toggle button disappears; all matching credentials for that issuer render (ignores curation), e.g. IBM shows all 12
- [ ] Click "All" again → returns to the default curated 4-item view
- [ ] Toggle button has `aria-expanded` reflecting state; decorative chevron icon is `aria-hidden`

## Acceptance-criteria coverage

- "the section shows a featured set by default with the full set behind one click" → covered by steps 1, 2
- "filter buttons still work against the full set" → covered by step 4
