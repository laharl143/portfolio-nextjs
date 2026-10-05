# Verify: Public Products page · spec 0002 · updated 2026-10-05
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] From `/`, open the header menu and pick Products → lands on `/products`, title `Products | Erskine Duenas` → AC-1, AC-7
- [x] On `/products`, open the header menu and pick Projects → goes to `/#projects` on the home page → AC-1
- [x] On `/products`, click Skills in the footer → goes to `/#skills` → AC-1
- [x] On `/`, pick Projects in the header menu → smooth scrolls in place, URL stays `/` → AC-8
- [x] Sections appear in order Built (1 product), In progress (2), Up next (2), Planned (10); the cards inside each keep the data file order (Vital Stats; OMS, RoomPOS; Shared Platform, Booking; Inventory Sync … JLPT Vocab SRS) → AC-2
- [x] Each card shows its name, a text status badge (Built, In progress, Up next, Planned), and its public summary → AC-3
- [x] The OMS card: Sends to Vital Stats (Live), Reporting, Helpdesk, Marketing Automation (Planned); Receives from Vital Stats (Live), Inventory Sync, CRM (Planned) → AC-4
- [x] Click OMS inside the CRM card → URL becomes `/products#product-oms` and the OMS card is highlighted → AC-4
- [x] The JLPT Vocab SRS card shows "Standalone, no connections by design" → AC-4
- [x] The RoomPOS card says "POS for karaoke and room rental venues" with no mention of a client → AC-5
- [x] At 375px wide in dark mode: no horizontal scroll, badges readable; repeat in light mode → AC-6
- [x] Tab through the page: every link shows a visible focus ring; one `h1`, an `h2` per status section, an `h3` per product → AC-6

## Commands
- [x] `npm run build` → succeeds and lists `○ /products` (static) → AC-1
- [x] Search `.next/server/app/products.html` and `utils/data/products-data.ts` for `github.com/laharl143`, `OMS-116`, `RP-2`, `VS-256`, `client's target architecture`, `Phases 0 to 2`, `Keycloak`, `Drizzle`, `Hono`, `Your plan says`, `practice build` → zero matches (the home page's GitHub profile link is expected and out of scope) → AC-5
- [x] `npx tsc --noEmit` → passes; adding a `notes` field to any product in the data file fails to compile → AC-5

## Value sourcing checks
- [ ] Section counts match `products.filter(status)` (change one status in the data file locally, the counts move) → AC-2
- [x] Badge text comes from `statusSections` titles → AC-3
- [x] Sends to and Receives from lists match `productLinks` for 2 other products (e.g. Booking, General Ledger) → AC-4
- [x] Live or Planned markers match `ProductLink.state` (only the two Vital Stats and OMS links are Live) → AC-4
- [x] Card anchors are `product-<id>` for every product → AC-4
- [x] Meta description matches the spec text → AC-7

## Acceptance-criteria coverage
- AC-1: header menu steps, footer step, build command · AC-2: section order, count check · AC-3: card content, badge source · AC-4: OMS lists, anchor click, JLPT, link checks · AC-5: RoomPOS copy, privacy search, typecheck · AC-6: 375px dark and light, keyboard and headings · AC-7: title, description · AC-8: home menu smooth scroll
