import { sql, type SQL } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  BILLING_CADENCES,
  CLIENT_STATUSES,
  CONTACT_CHANNELS,
  CONTRACT_STATUSES,
  PROJECT_STATUSES,
  SYSTEM_LINK_STATES,
  SYSTEM_RESOURCE_KINDS,
  SYSTEM_STATUSES,
  type BillingCadence,
  type ClientStatus,
  type ContactChannel,
  type ContractStatus,
  type ProjectStatus,
  type SystemLinkState,
  type SystemResourceKind,
  type SystemStatus,
} from "./constants";

// Every studio table lives in the Postgres schema `studio` (spec 0003, AC-7). The data model is spec 0004.
// No "server-only" import: drizzle-kit loads this file outside Next. It holds table shapes only;
// the connection lives in ./client.ts, which is server-only.
export const studio = pgSchema("studio");

// `('a', 'b')` written literally into the DDL. Check constraints cannot take bound parameters.
function inList(values: readonly string[]): SQL {
  return sql.raw(`(${values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ")})`);
}

function oneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  return sql`${column} in ${inList(values)}`;
}

function notBlank(column: AnyPgColumn): SQL {
  return sql`length(trim(${column})) > 0`;
}

// True when either date is missing, so the rule only applies once both are set.
function notBefore(later: AnyPgColumn, earlier: AnyPgColumn): SQL {
  return sql`${later} is null or ${earlier} is null or ${later} >= ${earlier}`;
}

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

const timestamps = {
  createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const workspaces = studio.table(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("workspaces_slug_uq").on(t.slug)],
);

function workspaceId() {
  return uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "restrict" });
}

export const clients = studio.table(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    name: text("name").notNull(),
    status: text("status").$type<ClientStatus>().notNull().default("lead"),
    website: text("website"),
    industry: text("industry"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("clients_status_check", oneOf(t.status, CLIENT_STATUSES)),
    check("clients_name_not_blank", notBlank(t.name)),
    uniqueIndex("clients_workspace_name_uq")
      .on(t.workspaceId, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} is null`),
    index("clients_workspace_status_idx").on(t.workspaceId, t.status),
  ],
);

export const contacts = studio.table(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    preferredChannel: text("preferred_channel").$type<ContactChannel>(),
    isPrimary: boolean("is_primary").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("contacts_preferred_channel_check", oneOf(t.preferredChannel, CONTACT_CHANNELS)),
    check("contacts_full_name_not_blank", notBlank(t.fullName)),
    uniqueIndex("contacts_one_primary_uq")
      .on(t.clientId)
      .where(sql`${t.isPrimary} and ${t.archivedAt} is null`),
    uniqueIndex("contacts_client_email_uq")
      .on(t.clientId, sql`lower(${t.email})`)
      .where(sql`${t.email} is not null and ${t.archivedAt} is null`),
    index("contacts_workspace_idx").on(t.workspaceId),
    index("contacts_client_idx").on(t.clientId),
  ],
);

export const projects = studio.table(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    status: text("status").$type<ProjectStatus>().notNull().default("planned"),
    description: text("description"),
    startDate: date("start_date"),
    targetEndDate: date("target_end_date"),
    actualEndDate: date("actual_end_date"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("projects_status_check", oneOf(t.status, PROJECT_STATUSES)),
    check("projects_name_not_blank", notBlank(t.name)),
    check("projects_target_end_after_start", notBefore(t.targetEndDate, t.startDate)),
    check("projects_actual_end_after_start", notBefore(t.actualEndDate, t.startDate)),
    check(
      "projects_actual_end_when_finished",
      sql`${t.actualEndDate} is null or ${t.status} in ${inList(["done", "cancelled"])}`,
    ),
    // Target of the contracts composite key, so a contract's project always belongs to the same client.
    unique("projects_id_client_uq").on(t.id, t.clientId),
    index("projects_workspace_idx").on(t.workspaceId),
    index("projects_client_idx").on(t.clientId),
  ],
);

export const systems = studio.table(
  "systems",
  {
    // A slug (the public ProductId for seeded systems), not a uuid.
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    name: text("name").notNull(),
    status: text("status").$type<SystemStatus>().notNull(),
    publicSummary: text("public_summary").notNull(),
    // Private fields: studio only, never exported publicly.
    summary: text("summary"),
    lessons: text("lessons"),
    stack: text("stack")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    standalone: boolean("standalone").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("systems_id_slug_check", sql`${t.id} ~ '^[a-z0-9-]+$'`),
    check("systems_status_check", oneOf(t.status, SYSTEM_STATUSES)),
    check("systems_name_not_blank", notBlank(t.name)),
    index("systems_workspace_status_sort_idx").on(t.workspaceId, t.status, t.sortOrder),
  ],
);

// A link, not a record: hard delete allowed.
export const projectSystems = studio.table(
  "project_systems",
  {
    workspaceId: workspaceId(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    systemId: text("system_id")
      .notNull()
      .references(() => systems.id, { onDelete: "restrict" }),
    createdAt,
  },
  (t) => [
    primaryKey({ name: "project_systems_pk", columns: [t.projectId, t.systemId] }),
    index("project_systems_workspace_idx").on(t.workspaceId),
    index("project_systems_system_idx").on(t.systemId),
  ],
);

export const contracts = studio.table(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: uuid("project_id"),
    title: text("title").notNull(),
    // Changed only by changeContractStatus() in src/studio/data/contracts.ts.
    status: text("status").$type<ContractStatus>().notNull().default("draft"),
    // Centavos.
    amountMinor: bigint("amount_minor", { mode: "bigint" }),
    currency: text("currency").notNull().default("PHP"),
    billingCadence: text("billing_cadence").$type<BillingCadence>(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    termsSummary: text("terms_summary"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Skipped when project_id is null (MATCH SIMPLE).
    foreignKey({
      name: "contracts_project_client_fk",
      columns: [t.projectId, t.clientId],
      foreignColumns: [projects.id, projects.clientId],
    }).onDelete("restrict"),
    check("contracts_status_check", oneOf(t.status, CONTRACT_STATUSES)),
    check("contracts_billing_cadence_check", oneOf(t.billingCadence, BILLING_CADENCES)),
    check("contracts_title_not_blank", notBlank(t.title)),
    check("contracts_amount_not_negative", sql`${t.amountMinor} >= 0`),
    check("contracts_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("contracts_end_after_start", notBefore(t.endDate, t.startDate)),
    index("contracts_workspace_status_idx").on(t.workspaceId, t.status),
    index("contracts_client_idx").on(t.clientId),
    index("contracts_project_idx").on(t.projectId),
  ],
);

// Append only: a trigger (custom migration) rejects any update or delete.
export const contractStatusEvents = studio.table(
  "contract_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "restrict" }),
    fromStatus: text("from_status").$type<ContractStatus>(),
    toStatus: text("to_status").$type<ContractStatus>().notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
    createdAt,
  },
  (t) => [
    check("contract_status_events_from_status_check", oneOf(t.fromStatus, CONTRACT_STATUSES)),
    check("contract_status_events_to_status_check", oneOf(t.toStatus, CONTRACT_STATUSES)),
    check("contract_status_events_opening_is_draft", sql`${t.fromStatus} is not null or ${t.toStatus} = 'draft'`),
    check("contract_status_events_from_to_differ", sql`${t.fromStatus} is distinct from ${t.toStatus}`),
    uniqueIndex("contract_status_events_one_opening_uq")
      .on(t.contractId)
      .where(sql`${t.fromStatus} is null`),
    index("contract_status_events_contract_changed_idx").on(t.contractId, t.changedAt),
    index("contract_status_events_workspace_idx").on(t.workspaceId),
  ],
);

// Editable and hard deletable. Exactly one target per note.
export const notes = studio.table(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    body: text("body").notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "restrict" }),
    contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "restrict" }),
    systemId: text("system_id").references(() => systems.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    check("notes_body_not_blank", notBlank(t.body)),
    check(
      "notes_exactly_one_target",
      sql`num_nonnulls(${t.clientId}, ${t.contactId}, ${t.projectId}, ${t.contractId}, ${t.systemId}) = 1`,
    ),
    index("notes_workspace_idx").on(t.workspaceId),
    index("notes_client_created_idx").on(t.clientId, t.createdAt.desc()),
    index("notes_contact_created_idx").on(t.contactId, t.createdAt.desc()),
    index("notes_project_created_idx").on(t.projectId, t.createdAt.desc()),
    index("notes_contract_created_idx").on(t.contractId, t.createdAt.desc()),
    index("notes_system_created_idx").on(t.systemId, t.createdAt.desc()),
  ],
);

// Directed system to system links. Hard delete allowed.
export const systemLinks = studio.table(
  "system_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    fromSystemId: text("from_system_id")
      .notNull()
      .references(() => systems.id, { onDelete: "restrict" }),
    toSystemId: text("to_system_id")
      .notNull()
      .references(() => systems.id, { onDelete: "restrict" }),
    label: text("label").notNull(),
    state: text("state").$type<SystemLinkState>().notNull(),
    ...timestamps,
  },
  (t) => [
    check("system_links_state_check", oneOf(t.state, SYSTEM_LINK_STATES)),
    check("system_links_label_not_blank", notBlank(t.label)),
    check("system_links_not_self", sql`${t.fromSystemId} <> ${t.toSystemId}`),
    unique("system_links_from_to_uq").on(t.fromSystemId, t.toSystemId),
    index("system_links_workspace_idx").on(t.workspaceId),
    index("system_links_to_idx").on(t.toSystemId),
  ],
);

// Private links for a system (repo, docs, board). Never public. Hard delete allowed.
export const systemResources = studio.table(
  "system_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    systemId: text("system_id")
      .notNull()
      .references(() => systems.id, { onDelete: "restrict" }),
    kind: text("kind").$type<SystemResourceKind>().notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    ...timestamps,
  },
  (t) => [
    check("system_resources_kind_check", oneOf(t.kind, SYSTEM_RESOURCE_KINDS)),
    check("system_resources_label_not_blank", notBlank(t.label)),
    check("system_resources_url_check", sql`${t.url} ~ '^https?://'`),
    index("system_resources_workspace_idx").on(t.workspaceId),
    index("system_resources_system_idx").on(t.systemId),
  ],
);
