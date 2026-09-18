# Verify: Certifications curation · scope feature 13 · updated 2026-09-18

_Steps derived from the feature's "Done when" line (no formal spec; small, pre-agreed UI change). `/check verify` runs these._

**2026-09-18 note:** the featured set changed after this checklist was written (now 6 credentials: both Oracle certs, Introduction to Modern AI, Well-Architected Proficient, Claude Partner Badge, IBM Generative & Agentic AI Developer, per the engineer's request). Steps below verified against the current 6-item set; counts updated accordingly.

## UI / manual

- [x] Load the site, scroll to Certifications & Badges with "All" filter active → only the featured credentials render (6: both Oracle certs, Introduction to Modern AI, Well-Architected Proficient, Claude Partner Badge, IBM Generative & Agentic AI Developer)
- [x] Click "Show all 23 credentials" → all 23 credentials render, plus 1 "More coming soon" placeholder card (23 mod 4 = 3 remainder); button label flips to "Show featured only"
- [x] Click "Show featured only" → returns to the 6-item curated view
- [x] With curated view active, click an issuer filter (e.g. "IBM") → toggle button disappears; all matching credentials for that issuer render (ignores curation); IBM shows all 12
- [x] Click "All" again → returns to the default curated 6-item view
- [x] Toggle button has `aria-expanded` reflecting state (confirmed "false" when collapsed); decorative chevron icon is `aria-hidden="true"`

## Acceptance-criteria coverage

- "the section shows a featured set by default with the full set behind one click" → covered by steps 1, 2
- "filter buttons still work against the full set" → covered by step 4
