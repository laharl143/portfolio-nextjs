# Verify: inquiry conversion tracking · spec 0020 · updated 2026-11-02
_Steps derived from spec 0020 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] On `/`, click the hero "Tell me about your project" → lands on `/contact` with no query string; `sessionStorage["ed:contact-location"]` holds `{ location: "hero", at }` → AC-1, AC-10
- [x] Click the footer Contact Me, then the header Contact Me before reaching the form → the stored location is `header` (last click wins) → AC-1
- [x] On `/personal` at 375px, open the mobile menu and tap the `#contact` item → `contact_click` fires with `mobile_nav`, nothing is stored → AC-1
- [x] With site data blocked (storage throws), click a call to action → it still navigates and `contact_click` still fires → AC-1
- [x] Set the stored value by hand to `{"location":"<script>","at":<now>}`, to invalid JSON, and to a time 31 minutes ago, then load `/contact` and type → each one fires `inquiry_start` with `location: "direct"` → AC-2
- [x] Arrive from the services link, click the hero link in another tab section mid draft, then send → events and the stored inquiry keep `services` (read once on mount) → AC-2
- [x] On `/contact`, focus and tab through every field → no `inquiry_start`; type one character in Company → exactly one `inquiry_start`; type more → no more → AC-3
- [x] Let browser autofill fill name and email → counts as the start (accepted) → AC-3
- [x] Send a valid inquiry with Cloudflare's always pass test keys → `inquiry_sent` once with the arrival location; the stored key is gone afterwards → AC-2, AC-4
- [x] Click "Start another inquiry", type, and send → `inquiry_start` and `inquiry_sent` fire again with `location: "direct"`, and the request body has no `sourceLocation` → AC-2, AC-3
- [x] Force a 422, 403 (Cloudflare's always fail test key), 429, a 500 or 503, and an offline request → `inquiry_failed` with `validation`, `challenge`, `rate_limited`, `server`, `network`; retrying the same draft fires it again → AC-5
- [x] After a failure, choose "Edit draft (new submission)" and type → no second `inquiry_start` → AC-3
- [x] Inspect every `inquiry_*` and `contact_click` request to Vercel Analytics → properties are only `location` (and `reason`), with no name, email, length, key, id, or status number → AC-6
- [x] Post to `/api/inquiries` with `sourceLocation` set to `"<script>"`, `7`, and a 5,000 character string → the inquiry is accepted with the same response, and the stored `source_location` is `null` → AC-7
- [x] Send the same draft (same `submissionKey`) twice, first with `hero`, then with `footer` → the second is a replay, not a 409, and the row keeps `hero` → AC-8
- [x] Open `/studio/inquiries/<id>` for rows with `hero`, `null`, and an unlabeled code → "Hero call to action", "Not recorded", and the raw code; desktop and 375px, light and dark, no horizontal scroll → AC-9
- [x] Walk the contact form's states (validation, Turnstile, pending, error, success with next steps) → unchanged from specs 0010 and 0019 → AC-10

## Commands
- [x] `npm run lint` → clean → AC-10
- [x] `npm test` → passes, including `src/lib/contact-location.test.ts`, `src/components/ContactForm.test.tsx`, `src/inquiries/rules.test.ts` → AC-1 to AC-8
- [x] `npm run test:db` → passes, including the source location retry test in `src/inquiries/workflow.db.test.ts` → AC-7, AC-8
- [x] `node scripts/check-retention-schema.mjs` and a column query on the dev branch → `studio.inquiries.source_location` exists, nullable, with `inquiries_source_location_check` → AC-7
- [x] `npm run test:e2e` with `DATABASE_URL` loaded (the Playwright process does not load `.env.development.local` itself) → `conversion-tracking`, `lead-intake`, `landing`, `brand` pass at desktop and 375px → AC-1, AC-9, AC-10
- [x] `npm run build` → ends with `[leak-check] clean` → AC-10

## Acceptance-criteria coverage
- AC-1 covered by the hero, last click, mobile menu, and blocked storage steps, plus `contact-location.test.ts` and the e2e handoff
- AC-2 by the tampered, expired, mid draft, and post send steps
- AC-3 by the focus, autofill, Edit draft, and Start another inquiry steps
- AC-4 by the valid send step and the unreadable body DOM test
- AC-5 by the forced status steps
- AC-6 by the analytics request inspection step
- AC-7 by the API tampering step and `rules.test.ts`
- AC-8 by the replay step and the database test
- AC-9 by the studio page step and the e2e Source row test
- AC-10 by the unchanged states walk, lint, build, and the regression e2e runs
