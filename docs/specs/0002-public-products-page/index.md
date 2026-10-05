# 0002. Public Products page from a static, public only data file

**Date**: 2026-10-05
**Status**: In Progress

## Summary

You get a new page at `/products` that shows your SMB product ecosystem: what is built, in progress, up next, and planned, and how the products feed each other. The page reads a small typed data file in the repo that holds only public fields (name, status, a rewritten public summary, and the connections). Nothing is fetched at runtime, so private notes, repo links, and client details can never leak, because they never enter the repo. When your systems map changes, you update the file by hand.

## Requirements

**User stories**:
- As a visitor (a prospective client or employer), I want to see which products Ed has built, is building, and plans, and how they connect, so that I understand the scope of his work.
- As Ed, I want the page to show only public fields so that private notes, repo links, and client details never appear on the public site.

**Acceptance criteria**:
- **AC-1**: `/products` exists as its own route, is prerendered as static HTML at build time, and is reachable from the header menu on both `/` and `/products`. From `/products`, the header's section links (About me, Certifications, Skills, Projects, FAQs) go back to the matching section on the home page.
- **AC-2**: The page lists all 15 systems, grouped into 4 sections in this order: Built, In progress, Up next, Planned. Each section heading shows its count. Within a section, products keep the order of the data file. A section with no products is not rendered.
- **AC-3**: Each product card shows its name, a status badge written in text (not color alone), and its public summary.
- **AC-4**: Each card lists its connections in two groups, "Sends to" and "Receives from". Each entry shows the other product's name, the connection label, and a text marker `Live` or `Planned`. Each product name links to that product's card on the same page (`#product-<id>`). A product with no connections shows "Standalone, no connections by design".
- **AC-5**: Only public fields exist in the data file and the built page: id, name, status, public summary, and connections. No notes, lessons, stack, repo URLs, ticket keys, or client references appear anywhere in the data file or the built output. RoomPOS is described generically, as a POS for karaoke and room rental venues.
- **AC-6**: The page works in light and dark themes and at a 375px wide phone viewport with no horizontal scroll. It uses one `h1`, an `h2` per status section, and an `h3` per product. All links show a visible keyboard focus.
- **AC-7**: The page sets its own title (`Products | Erskine Duenas`) and meta description.
- **AC-8**: The home page is otherwise unchanged, and its mobile menu still scrolls smoothly to sections on `/`.

## Decision

**Chosen option**: Option 1: Static, typed, public only data file in the repo

The `/products` page renders from `utils/data/products-data.ts`, a hand curated file whose types allow only public fields, prerendered at build time.

**Implementation skills**: `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.claude/skills/tailwindcss-advanced-layouts/`)

## Rationale

Reasoning, context, and options considered: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (TypeScript, in `utils/data/products-data.ts`; no database):

| Type | Fields | Notes |
|---|---|---|
| `ProductId` | string union of the 15 ids: `vital-stats`, `oms`, `roompos`, `platform`, `booking`, `inventory-sync`, `invoicing`, `hr-payroll`, `reporting`, `crm`, `procurement`, `ledger`, `helpdesk`, `marketing`, `jlpt` | ids match the artifact doc ids so a future export maps 1:1 |
| `ProductStatus` | `"built" \| "in-progress" \| "next" \| "planned"` | mapped from artifact `built`, `ongoing`, `next`, `idea` |
| `PublicProduct` | `id: ProductId` (req), `name: string` (req), `status: ProductStatus` (req), `summary: string` (req) | no other fields allowed; declare the array as `PublicProduct[]` so object literals with extra keys fail to compile |
| `ProductLink` | `from: ProductId` (req), `to: ProductId` (req), `label: string` (req), `state: "live" \| "planned"` (req) | 1 product : N links in each direction |

Exports: `products: PublicProduct[]` (display order below), `productLinks: ProductLink[]`, and `statusSections: { status: ProductStatus; title: string }[]` = Built, In progress, Up next, Planned.

The products, in display order, with the public summaries (these exact texts, rewritten from the map; the map's `notes`, `lesson`, `stack`, `repo`, `group`, and `order` fields are left out):

| id | name | status | public summary |
|---|---|---|---|
| vital-stats | Vital Stats | built | Health products storefront with an admin back office: catalog, guest cart and checkout, online payment, an order status page, and customer emails. Paid orders flow into the OMS. |
| oms | OMS | in-progress | Reusable order management and fulfillment system: a REST API plus a staff dashboard, deployed once per business. Vital Stats is the first storefront running on it. |
| roompos | RoomPOS | in-progress | Multi tenant POS for karaoke and room rental venues: timed room sessions, food and drink orders, a kitchen queue, and checkout. |
| platform | Shared Platform | next | The shared event schemas and single sign in that every core product plugs into, built first so every app speaks the same language. |
| booking | Booking | next | Appointments for clinics, salons and repair shops: reminders, fewer no shows, and scheduling across staff, rooms and equipment. |
| inventory-sync | Inventory Sync | planned | Keeps stock in step across Shopify, Lazada, Shopee and the physical store in near real time, so small sellers stop overselling. |
| invoicing | Invoicing | planned | Automated invoicing and collections: generates invoices, sends scheduled reminders, and tracks payment status with local gateways (GCash, Maya). |
| hr-payroll | HR & Payroll | planned | HR, attendance and payroll for micro teams of 5 to 50: BIR compliant payroll, SSS, PhilHealth and Pag-IBIG deductions, daily time records. |
| reporting | Reporting | planned | One dashboard for non technical owners: daily sales, best sellers and cash flow pulled from the POS, ecommerce and accounting, no SQL needed. |
| crm | CRM | planned | Sales pipeline from lead to quote to customer. Feeds orders into the OMS, quotes into Invoicing, and consultations into Booking. |
| procurement | Procurement | planned | Purchase orders, supplier catalogs and reorder points. When Inventory Sync reports low stock, it raises a purchase order. |
| ledger | General Ledger | planned | Chart of accounts, journal entries, P&L and balance sheet, built from Invoicing, Payroll and Procurement events. Turns Reporting into real financial statements. |
| helpdesk | Helpdesk | planned | Support tickets tied to an order, invoice or booking, so an agent sees the full context without asking the customer again. |
| marketing | Marketing Automation | planned | Email and SMS campaigns triggered by events: abandoned bookings, overdue invoices, post purchase follow ups. |
| jlpt | JLPT Vocab SRS | planned | Spaced repetition flashcards for Japanese vocabulary that learn from your own mistakes. Standalone by design, with no integrations. |

The 21 links, copied as is from the map (`from → to: label, state`):
- vital-stats → oms: paid orders, stock and price checks, live
- oms → vital-stats: order status webhooks, live
- vital-stats → booking: consultation bookings (possible), planned
- vital-stats → reporting: storefront sales, planned
- oms → reporting: orders and fulfillment, planned
- oms → helpdesk: order context, planned
- oms → marketing: post purchase follow ups, planned
- roompos → reporting: sales and room sessions, planned
- booking → helpdesk: booking context, planned
- booking → marketing: abandoned bookings, planned
- inventory-sync → oms: stock levels across channels, planned
- inventory-sync → procurement: low stock raises a purchase order, planned
- invoicing → ledger: revenue, planned
- invoicing → helpdesk: invoice context, planned
- invoicing → marketing: overdue invoices, planned
- hr-payroll → ledger: payroll expenses, planned
- crm → booking: lead books a consultation, planned
- crm → invoicing: quote becomes an invoice, planned
- crm → oms: customer places an order, planned
- procurement → ledger: cost of goods, planned
- ledger → reporting: financial statements, planned

**State transitions**: none on the page. A product's status changes only when you edit the data file.

**API surface** (no network API; these are the routes and module interfaces):

| Endpoint / module | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/products` (`src/app/products/page.tsx`) | GET (static) | none | Static HTML: Header, the Products section, Footer, ScrollToTop; `metadata` export | public | none at runtime; a bad id in a link fails `tsc` at build |
| `src/sections/Products.tsx` (server component) | import | `products`, `productLinks`, `statusSections` | `<section id="products-ecosystem">` with `h1`, the status sections, and the cards | n/a | none |
| `src/sections/Header.tsx` (changed) | import | the clicked link's `href`; the click handler compares `new URL(href).pathname` to `window.location.pathname` | `navItems` hrefs `/#hero`, `/#badges`, `/#skills`, `/#projects`, `/#faqs`, `/#contact`, plus `{ label: "Products", href: "/products" }` after Projects | public | a hash missing on the current page falls through to normal navigation |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render page | Section order and titles | `statusSections` in the data file |
| Render page | Section count | derived: `products.filter(p => p.status === s.status).length` |
| Render card | Name, summary | `PublicProduct.name`, `PublicProduct.summary` |
| Render card | Status badge text | derived from `status` through `statusSections[].title` (Built, In progress, Up next, Planned) |
| Render card | "Sends to" entries | `productLinks.filter(l => l.from === id)`, other name looked up from `products` by `l.to` |
| Render card | "Receives from" entries | `productLinks.filter(l => l.to === id)`, other name looked up by `l.from` |
| Render card | Live / Planned marker | `ProductLink.state` |
| Render card | Card anchor id and link target | derived: `product-${id}` |
| Page metadata | Title and description | constants in `page.tsx`: title `Products | Erskine Duenas`; description `The products Erskine Duenas has built, is building, and plans for small and medium businesses, and how they connect.` |
| Header click (mobile) | Scroll vs navigate | derived: compare the link's pathname with `window.location.pathname` |

**Key invariants**:
- The data file holds only the fields in the types above; the declared types make extra keys a compile error.
- Every `ProductLink.from` and `.to` is a valid `ProductId` (enforced by the union type).
- Every product id is unique; card anchors are unique.
- No string containing a repo URL, ticket key, or client reference is in the data file.

**Security model**: The page is public and read only. There is no auth, input, or runtime data. The only sensitive concern is accidental disclosure, which is handled by keeping private fields out of the repo (AC-5). No compliance scope applies.

**Critical test scenarios**:
- Happy path: open `/products` from the home header menu; the 4 sections render with counts 1, 2, 2, 10, and OMS shows "Sends to" Vital Stats (Live), Reporting, Helpdesk, and Marketing Automation, and "Receives from" Vital Stats (Live), Inventory Sync, and CRM. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- Failure case: from `/products`, tap "Projects" in the mobile menu; the browser goes to `/#projects` instead of doing nothing; on `/`, the same tap still smooth scrolls. Verifies **AC-1**, **AC-8**.
- Privacy: after `npm run build`, a text search of `.next/` and `utils/data/products-data.ts` finds none of `github.com/laharl143`, `OMS-116`, `RP-2`, `VS-256`, `client's target architecture`, `Phases 0 to 2`, `Keycloak`, `Drizzle`, `Hono`, `Your plan says`. Verifies **AC-5**.
- Layout: at 375px wide in dark mode, there is no horizontal scroll and the badges stay readable. Verifies **AC-6**.

## Build plan

Ordered Tracer Bullet style: a thin working page through the real route and real data first, then thicken.

1. Create `utils/data/products-data.ts` with the types, the 15 products in display order with the public summaries above, the 21 links, and `statusSections`, satisfies **AC-2**, **AC-5**
2. Add `src/app/products/page.tsx` (metadata, Header, Products section, Footer, ScrollToTop) and `src/sections/Products.tsx` rendering the status sections with counts and cards (name, status badge, summary), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-7**
3. Make the header route aware: `/#id` hrefs, the `Products` item, and the mobile handler scrolling only for links to the current page, satisfies **AC-1**, **AC-8**
4. Add connections to each card ("Sends to", "Receives from", Live/Planned markers, in page anchors, the standalone message), satisfies **AC-4**
5. Polish and privacy sweep: theme colors, 375px layout, heading levels, focus rings; run `npm run build` (confirm `/products` is static) and the privacy search, satisfies **AC-5**, **AC-6**, **AC-1**

## Consequences

**Positive**:
- A shareable page that shows the product vision, with no runtime cost and no client JavaScript of its own.
- Private fields cannot leak because they are not in the repo.
- The typed shape is ready for feature 24 to generate this file from the studio later.

**Negative / tradeoffs**:
- The data drifts from the map until you edit the file; status changes need a commit and a deploy.
- The rewritten summaries are a second copy of the wording that you have to keep in step with the map.
- Header links now use `/#id`, so on the home page a desktop link click (if one is added later) also goes through the handler logic.

**Neutral**:
- First `.ts` file in `utils/data/` (the others are `.js`); the extension convention is already mixed.
- SEO extras (Open Graph card, sitemap entry) are left to feature 15.

## Follow-up

- [ ] Feature 15 (SEO foundation): include `/products` in the sitemap and give it a social card.
- [ ] Feature 24 (private systems map): replace the hand edited file with a generated public export that uses the same `PublicProduct` and `ProductLink` types.
- [ ] When a system's status changes in the map, update `utils/data/products-data.ts` in the same week (until feature 24 lands).
