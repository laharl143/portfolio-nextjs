// Public product ecosystem data for the /products page (spec 0002).
// PUBLIC FIELDS ONLY: id, name, status, summary, and the links between products.
// Never add notes, lessons, stack, repo links, ticket keys, or client references here.
// The private source of truth is the SMB Systems Map; summaries below are rewritten for the public.

export type ProductId =
  | "vital-stats"
  | "oms"
  | "roompos"
  | "platform"
  | "booking"
  | "inventory-sync"
  | "invoicing"
  | "hr-payroll"
  | "reporting"
  | "crm"
  | "procurement"
  | "ledger"
  | "helpdesk"
  | "marketing"
  | "jlpt";

export type ProductStatus = "built" | "in-progress" | "next" | "planned";

export type PublicProduct = {
  id: ProductId;
  name: string;
  status: ProductStatus;
  summary: string;
};

export type ProductLink = {
  from: ProductId;
  to: ProductId;
  label: string;
  state: "live" | "planned";
};

export const statusSections: { status: ProductStatus; title: string }[] = [
  { status: "built", title: "Built" },
  { status: "in-progress", title: "In progress" },
  { status: "next", title: "Up next" },
  { status: "planned", title: "Planned" },
];

// Display order within each status section follows this array.
export const products: PublicProduct[] = [
  {
    id: "vital-stats",
    name: "Vital Stats",
    status: "built",
    summary:
      "Health products storefront with an admin back office: catalog, guest cart and checkout, online payment, an order status page, and customer emails. Paid orders flow into the OMS.",
  },
  {
    id: "oms",
    name: "OMS",
    status: "in-progress",
    summary:
      "Reusable order management and fulfillment system: a REST API plus a staff dashboard, deployed once per business. Vital Stats is the first storefront running on it.",
  },
  {
    id: "roompos",
    name: "RoomPOS",
    status: "in-progress",
    summary:
      "Multi tenant POS for karaoke and room rental venues: timed room sessions, food and drink orders, a kitchen queue, and checkout.",
  },
  {
    id: "platform",
    name: "Shared Platform",
    status: "next",
    summary:
      "The shared event schemas and single sign in that every core product plugs into, built first so every app speaks the same language.",
  },
  {
    id: "booking",
    name: "Booking",
    status: "next",
    summary:
      "Appointments for clinics, salons and repair shops: reminders, fewer no shows, and scheduling across staff, rooms and equipment.",
  },
  {
    id: "inventory-sync",
    name: "Inventory Sync",
    status: "planned",
    summary:
      "Keeps stock in step across Shopify, Lazada, Shopee and the physical store in near real time, so small sellers stop overselling.",
  },
  {
    id: "invoicing",
    name: "Invoicing",
    status: "planned",
    summary:
      "Automated invoicing and collections: generates invoices, sends scheduled reminders, and tracks payment status with local gateways (GCash, Maya).",
  },
  {
    id: "hr-payroll",
    name: "HR & Payroll",
    status: "planned",
    summary:
      "HR, attendance and payroll for micro teams of 5 to 50: BIR compliant payroll, SSS, PhilHealth and Pag-IBIG deductions, daily time records.",
  },
  {
    id: "reporting",
    name: "Reporting",
    status: "planned",
    summary:
      "One dashboard for non technical owners: daily sales, best sellers and cash flow pulled from the POS, ecommerce and accounting, no SQL needed.",
  },
  {
    id: "crm",
    name: "CRM",
    status: "planned",
    summary:
      "Sales pipeline from lead to quote to customer. Feeds orders into the OMS, quotes into Invoicing, and consultations into Booking.",
  },
  {
    id: "procurement",
    name: "Procurement",
    status: "planned",
    summary:
      "Purchase orders, supplier catalogs and reorder points. When Inventory Sync reports low stock, it raises a purchase order.",
  },
  {
    id: "ledger",
    name: "General Ledger",
    status: "planned",
    summary:
      "Chart of accounts, journal entries, P&L and balance sheet, built from Invoicing, Payroll and Procurement events. Turns Reporting into real financial statements.",
  },
  {
    id: "helpdesk",
    name: "Helpdesk",
    status: "planned",
    summary:
      "Support tickets tied to an order, invoice or booking, so an agent sees the full context without asking the customer again.",
  },
  {
    id: "marketing",
    name: "Marketing Automation",
    status: "planned",
    summary:
      "Email and SMS campaigns triggered by events: abandoned bookings, overdue invoices, post purchase follow ups.",
  },
  {
    id: "jlpt",
    name: "JLPT Vocab SRS",
    status: "planned",
    summary:
      "Spaced repetition flashcards for Japanese vocabulary that learn from your own mistakes. Standalone by design, with no integrations.",
  },
];

export const productLinks: ProductLink[] = [
  { from: "vital-stats", to: "oms", label: "paid orders, stock and price checks", state: "live" },
  { from: "oms", to: "vital-stats", label: "order status webhooks", state: "live" },
  { from: "vital-stats", to: "booking", label: "consultation bookings (possible)", state: "planned" },
  { from: "vital-stats", to: "reporting", label: "storefront sales", state: "planned" },
  { from: "oms", to: "reporting", label: "orders and fulfillment", state: "planned" },
  { from: "oms", to: "helpdesk", label: "order context", state: "planned" },
  { from: "oms", to: "marketing", label: "post purchase follow ups", state: "planned" },
  { from: "roompos", to: "reporting", label: "sales and room sessions", state: "planned" },
  { from: "booking", to: "helpdesk", label: "booking context", state: "planned" },
  { from: "booking", to: "marketing", label: "abandoned bookings", state: "planned" },
  { from: "inventory-sync", to: "oms", label: "stock levels across channels", state: "planned" },
  { from: "inventory-sync", to: "procurement", label: "low stock raises a purchase order", state: "planned" },
  { from: "invoicing", to: "ledger", label: "revenue", state: "planned" },
  { from: "invoicing", to: "helpdesk", label: "invoice context", state: "planned" },
  { from: "invoicing", to: "marketing", label: "overdue invoices", state: "planned" },
  { from: "hr-payroll", to: "ledger", label: "payroll expenses", state: "planned" },
  { from: "crm", to: "booking", label: "lead books a consultation", state: "planned" },
  { from: "crm", to: "invoicing", label: "quote becomes an invoice", state: "planned" },
  { from: "crm", to: "oms", label: "customer places an order", state: "planned" },
  { from: "procurement", to: "ledger", label: "cost of goods", state: "planned" },
  { from: "ledger", to: "reporting", label: "financial statements", state: "planned" },
];
