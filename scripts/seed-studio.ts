// Fills the Neon dev branch with clearly fake studio records (spec 0004, AC-7). Rerunnable: a second run changes nothing.
// Run with `npm run db:seed`. Never against production, never on Vercel.
import { loadEnvConfig } from "@next/env";

// Dev mode, so .env.development.local (the Neon dev branch) wins, as it does for `next dev` and drizzle-kit.
loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });

function hostOf(connectionString: string | undefined): string {
  if (!connectionString) {
    return "";
  }
  try {
    return new URL(connectionString).hostname.replace("-pooler", "");
  } catch {
    return "";
  }
}

function assertSafeTarget(): string {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error("refusing to seed on Vercel (VERCEL or VERCEL_ENV is set)");
  }
  if (typeof globalThis.WebSocket === "undefined") {
    throw new Error("no global WebSocket: the Neon driver needs Node 22 or newer");
  }
  const pooledHost = hostOf(process.env.DATABASE_URL);
  if (!pooledHost) {
    throw new Error("DATABASE_URL is not set (it lives in .env.development.local)");
  }
  const prodHost = hostOf(process.env.STUDIO_PROD_DB_HOST ? `postgres://${process.env.STUDIO_PROD_DB_HOST}` : "");
  const directHost = hostOf(process.env.DATABASE_URL_UNPOOLED);
  if (prodHost && (pooledHost === prodHost || directHost === prodHost)) {
    throw new Error("DATABASE_URL points at the production database host, refusing to seed");
  }
  return pooledHost;
}

// Fixed ids, so every run targets the same rows. Every name says Example, Sample, or Demo; every email is at example.com.
const ID = {
  bakery: "5eed0000-0000-4000-8000-000000000101",
  clinic: "5eed0000-0000-4000-8000-000000000102",
  hardware: "5eed0000-0000-4000-8000-000000000103",
  bakeryOwner: "5eed0000-0000-4000-8000-000000000201",
  bakeryOps: "5eed0000-0000-4000-8000-000000000202",
  clinicAdmin: "5eed0000-0000-4000-8000-000000000203",
  hardwareOwner: "5eed0000-0000-4000-8000-000000000204",
  bakerySite: "5eed0000-0000-4000-8000-000000000301",
  clinicBooking: "5eed0000-0000-4000-8000-000000000302",
  hardwareStock: "5eed0000-0000-4000-8000-000000000303",
  bakeryContract: "5eed0000-0000-4000-8000-000000000401",
  clinicContract: "5eed0000-0000-4000-8000-000000000402",
  hardwareContract: "5eed0000-0000-4000-8000-000000000403",
} as const;

const CLIENTS = [
  { id: ID.bakery, name: "Example Bakery Co", status: "active", industry: "Food", website: "https://bakery.example.com" },
  { id: ID.clinic, name: "Sample Dental Clinic", status: "lead", industry: "Health", website: null },
  { id: ID.hardware, name: "Demo Hardware Supply", status: "past", industry: "Retail", website: null },
] as const;

const CONTACTS = [
  {
    id: ID.bakeryOwner,
    clientId: ID.bakery,
    fullName: "Example Owner",
    email: "owner@example.com",
    preferredChannel: "email",
    isPrimary: true,
  },
  {
    id: ID.bakeryOps,
    clientId: ID.bakery,
    fullName: "Example Ops Lead",
    email: "ops@example.com",
    preferredChannel: "viber",
    isPrimary: false,
  },
  {
    id: ID.clinicAdmin,
    clientId: ID.clinic,
    fullName: "Sample Clinic Admin",
    email: "admin@example.com",
    preferredChannel: "phone",
    isPrimary: true,
  },
  {
    id: ID.hardwareOwner,
    clientId: ID.hardware,
    fullName: "Demo Store Owner",
    email: "store@example.com",
    preferredChannel: "whatsapp",
    isPrimary: true,
  },
] as const;

const PROJECTS = [
  {
    id: ID.bakerySite,
    clientId: ID.bakery,
    name: "Example storefront build",
    status: "active",
    startDate: "2026-01-05",
    targetEndDate: "2026-03-31",
  },
  { id: ID.clinicBooking, clientId: ID.clinic, name: "Sample booking setup", status: "planned" },
  { id: ID.hardwareStock, clientId: ID.hardware, name: "Demo stock sync pilot", status: "cancelled", startDate: "2025-09-01" },
] as const;

const PROJECT_SYSTEMS = [
  { projectId: ID.bakerySite, systemId: "vital-stats" },
  { projectId: ID.clinicBooking, systemId: "booking" },
  { projectId: ID.hardwareStock, systemId: "inventory-sync" },
] as const;

// `path` is the walk from draft to the target status, applied through changeContractStatus().
const CONTRACTS = [
  {
    id: ID.bakeryContract,
    input: {
      clientId: ID.bakery,
      projectId: ID.bakerySite,
      title: "Example storefront build",
      amountMinor: 15_000_000,
      billingCadence: "milestone",
      startDate: "2026-01-05",
      endDate: "2026-12-31",
    },
    path: ["draft", "sent", "signed", "active"],
  },
  {
    id: ID.clinicContract,
    input: {
      clientId: ID.clinic,
      projectId: ID.clinicBooking,
      title: "Sample booking setup",
      amountMinor: 4_500_000,
      billingCadence: "one_time",
    },
    path: ["draft"],
  },
  {
    id: ID.hardwareContract,
    input: {
      clientId: ID.hardware,
      projectId: ID.hardwareStock,
      title: "Demo stock sync pilot",
      amountMinor: 3_000_000,
      billingCadence: "monthly",
    },
    path: ["draft", "cancelled"],
    note: "Fake note: the demo client chose to wait a year.",
  },
] as const;

const NOTES = [
  { id: "5eed0000-0000-4000-8000-000000000501", body: "Fake note: kickoff call went well.", clientId: ID.bakery },
  { id: "5eed0000-0000-4000-8000-000000000502", body: "Fake note: prefers Viber in the mornings.", contactId: ID.bakeryOps },
  { id: "5eed0000-0000-4000-8000-000000000503", body: "Fake note: asked for a quote on reminders.", clientId: ID.clinic },
  { id: "5eed0000-0000-4000-8000-000000000504", body: "Fake note: pilot paused before it started.", projectId: ID.hardwareStock },
  { id: "5eed0000-0000-4000-8000-000000000505", body: "Fake note: second milestone due in March.", contractId: ID.bakeryContract },
] as const;

function report(label: string, created: number, total: number) {
  console.log(`[seed] ${label}: ${created} created, ${total - created} already present`);
}

async function main() {
  const host = assertSafeTarget();
  console.log(`[seed] target database host: ${host}`);

  // Imported only after the env is loaded and the target is checked.
  const { eq } = await import("drizzle-orm");
  const { getDb, closeDb } = await import("../src/studio/db/client");
  const schema = await import("../src/studio/db/schema");
  const { STUDIO_WORKSPACE_ID, getWorkspaceId, runInWorkspace } = await import("../src/studio/data/workspace");
  const { createContract, changeContractStatus } = await import("../src/studio/data/contracts");
  const { products, productLinks } = await import("../utils/data/products-data");

  // The seed has no session, so it runs inside an explicit workspace scope (spec 0005, AC-11).
  await runInWorkspace(STUDIO_WORKSPACE_ID, async () => {
    try {
      const db = getDb();
      const workspaceId = await getWorkspaceId();

      // Systems first, since projects link to them. Copied from the public data; private fields stay empty.
      const systems = await db
        .insert(schema.systems)
        .values(
          products.map((product, index) => ({
            id: product.id,
            workspaceId,
            name: product.name,
            status: product.status,
            publicSummary: product.summary,
            standalone: product.standalone === true,
            sortOrder: index,
          })),
        )
        .onConflictDoNothing({ target: schema.systems.id })
        .returning({ id: schema.systems.id });
      report("systems", systems.length, products.length);

      const links = await db
        .insert(schema.systemLinks)
        .values(
          productLinks.map((link) => ({
            workspaceId,
            fromSystemId: link.from,
            toSystemId: link.to,
            label: link.label,
            state: link.state,
          })),
        )
        .onConflictDoNothing({ target: [schema.systemLinks.fromSystemId, schema.systemLinks.toSystemId] })
        .returning({ id: schema.systemLinks.id });
      report("system links", links.length, productLinks.length);

      const clients = await db
        .insert(schema.clients)
        .values(CLIENTS.map((client) => ({ ...client, workspaceId })))
        .onConflictDoNothing({ target: schema.clients.id })
        .returning({ id: schema.clients.id });
      report("clients", clients.length, CLIENTS.length);

      // Children carry their parent's workspace, which is this workspace for every seeded client.
      const contacts = await db
        .insert(schema.contacts)
        .values(CONTACTS.map((contact) => ({ ...contact, workspaceId })))
        .onConflictDoNothing({ target: schema.contacts.id })
        .returning({ id: schema.contacts.id });
      report("contacts", contacts.length, CONTACTS.length);

      const projects = await db
        .insert(schema.projects)
        .values(PROJECTS.map((project) => ({ ...project, workspaceId })))
        .onConflictDoNothing({ target: schema.projects.id })
        .returning({ id: schema.projects.id });
      report("projects", projects.length, PROJECTS.length);

      const projectSystems = await db
        .insert(schema.projectSystems)
        .values(PROJECT_SYSTEMS.map((link) => ({ ...link, workspaceId })))
        .onConflictDoNothing()
        .returning({ projectId: schema.projectSystems.projectId });
      report("project systems", projectSystems.length, PROJECT_SYSTEMS.length);

      let contractsCreated = 0;
      let steps = 0;
      for (const seeded of CONTRACTS) {
        const [existing] = await db
          .select({ status: schema.contracts.status })
          .from(schema.contracts)
          .where(eq(schema.contracts.id, seeded.id));
        let status = existing?.status;
        if (!status) {
          status = (await createContract(seeded.input, { id: seeded.id })).status;
          contractsCreated += 1;
        }

        // Resume the walk from wherever the contract is, so a run that crashed partway finishes it.
        const position = (seeded.path as readonly string[]).indexOf(status);
        if (position === -1) {
          console.warn(`[seed] contract ${seeded.id} is ${status}, off its seed path; left as is`);
          continue;
        }
        for (const to of seeded.path.slice(position + 1)) {
          await changeContractStatus({ contractId: seeded.id, to, note: "note" in seeded ? seeded.note : undefined });
          steps += 1;
        }
      }
      report("contracts", contractsCreated, CONTRACTS.length);
      console.log(`[seed] contract status steps applied: ${steps}`);

      // Notes last, since one points at a contract.
      const notes = await db
        .insert(schema.notes)
        .values(NOTES.map((note) => ({ ...note, workspaceId })))
        .onConflictDoNothing({ target: schema.notes.id })
        .returning({ id: schema.notes.id });
      report("notes", notes.length, NOTES.length);
    } finally {
      await closeDb();
    }
  });
}

main().catch((error) => {
  console.error(`[seed] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
