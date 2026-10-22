import { sql, type SQL } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
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
  AUTH_EVENT_KINDS,
  BILLING_CADENCES,
  CHALLENGE_PURPOSES,
  CLIENT_STATUSES,
  CONTACT_CHANNELS,
  CONTRACT_FILE_KINDS,
  CONTRACT_STATUSES,
  MEMBER_ROLES,
  PASSKEY_DEVICE_TYPES,
  PROJECT_STATUSES,
  SYSTEM_LAYERS,
  SYSTEM_LINK_STATES,
  SYSTEM_RESOURCE_KINDS,
  SYSTEM_STATUSES,
  type AuthEventKind,
  type BillingCadence,
  type ChallengePurpose,
  type ClientStatus,
  type ContactChannel,
  type ContractFileKind,
  type ContractStatus,
  type MemberRole,
  type PasskeyDeviceType,
  type ProjectStatus,
  type SystemLayer,
  type SystemLinkState,
  type SystemResourceKind,
  type SystemStatus,
} from "./constants";

// Every studio table lives in the Postgres schema `studio` (spec 0003, AC-7). The data model is spec 0004.
// No "server-only" import: drizzle-kit loads this file outside Next. It holds table shapes only;
// the connection lives in ./client.ts, which is server-only.
export const studio = pgSchema("studio");

// Spec 0011: short lived plans and finite audit receipts, never copies of personal content.
export const retentionPreviews = studio.table('retention_previews', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {onDelete:'restrict'}),
  actorUserId: uuid('actor_user_id').notNull().references(() => owners.id, {onDelete:'restrict'}),
  kind: text('kind').notNull(),
  targetId: uuid('target_id').notNull(),
  clientId: uuid('client_id').notNull(),
  policyVersion: text('policy_version').notNull(),
  snapshotHash: text('snapshot_hash').notNull(),
  createdAt: timestamp('created_at', {withTimezone:true}).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', {withTimezone:true}).notNull().default(sql`now() + interval '10 minutes'`),
}, t => [
  check('retention_previews_kind_check', sql`${t.kind} in ('client','contact')`),
  check('retention_previews_hash_check', sql`${t.snapshotHash} ~ '^[a-f0-9]{64}$'`),
  check('retention_previews_expiry_check', sql`${t.expiresAt} > ${t.createdAt}`),
  index('retention_previews_expiry_idx').on(t.workspaceId,t.expiresAt),
  index('retention_previews_actor_idx').on(t.workspaceId,t.actorUserId),
]);
export const retentionEvents = studio.table('retention_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {onDelete:'restrict'}),
  actorUserId: uuid('actor_user_id').notNull().references(() => owners.id, {onDelete:'restrict'}),
  kind: text('kind').notNull(),
  targetId: uuid('target_id').notNull(),
  action: text('action').notNull(),
  policyVersion: text('policy_version').notNull(),
  reason: text('reason'),
  counts: jsonb('counts').$type<{clients:number;contacts:number;notes:number}>().notNull(),
  createdAt: timestamp('created_at', {withTimezone:true}).notNull().defaultNow(),
}, t => [
  check('retention_events_kind_check', sql`${t.kind} in ('client','contact')`),
  check('retention_events_action_check', sql`${t.action} in ('remove','hold_set','hold_release')`),
  check('retention_events_reason_check', sql`(${t.action}='remove' and ${t.reason} is null) or (${t.action} in ('hold_set','hold_release') and ${t.reason} is not null and ${t.reason} in ('contract','payment','dispute','other_business_need'))`),
  check('retention_events_count_types_check', sql`jsonb_typeof(${t.counts}->'clients')='number' and jsonb_typeof(${t.counts}->'contacts')='number' and jsonb_typeof(${t.counts}->'notes')='number'`),
  check('retention_events_counts_check', sql`jsonb_typeof(${t.counts})='object' and ${t.counts} ?& array['clients','contacts','notes'] and (${t.counts} - 'clients' - 'contacts' - 'notes')='{}'::jsonb and (${t.counts}->>'clients') ~ '^(0|[1-9][0-9]*)$' and (${t.counts}->>'contacts') ~ '^(0|[1-9][0-9]*)$' and (${t.counts}->>'notes') ~ '^(0|[1-9][0-9]*)$' and (${t.action}='remove' or ${t.counts}='{"clients":0,"contacts":0,"notes":0}'::jsonb)`),
  index('retention_events_workspace_time_idx').on(t.workspaceId,t.createdAt),
]);

// Spec 0010: immutable visitor fields, private owner workflow, separate alert activity.
export const inquiries = studio.table(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    submissionKey: uuid("submission_key").notNull(),
    payloadHash: text("payload_hash").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    description: text("description").notNull(),
    company: text("company"),
    budget: text("budget"),
    privacyNoticeVersion: text("privacy_notice_version").notNull(),
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    conversionKey: uuid("conversion_key"),
    conversionHash: text("conversion_hash"),
    convertedClientId: uuid("converted_client_id").references(
      (): AnyPgColumn => clients.id,
    ),
    convertedContactId: uuid("converted_contact_id").references(
      (): AnyPgColumn => contacts.id,
    ),
    convertedNoteId: uuid("converted_note_id").references(
      (): AnyPgColumn => notes.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    unique("inquiries_workspace_submission_uq").on(
      t.workspaceId,
      t.submissionKey,
    ),
    index("inquiries_inbox_idx").on(t.workspaceId, t.status, t.createdAt, t.id),
    index("inquiries_activity_idx").on(t.workspaceId, t.lastActivityAt),
    index("inquiries_converted_idx").on(t.workspaceId, t.convertedAt),
    check(
      "inquiries_status_check",
      sql`${t.status} in ('new','reviewing','converted','closed')`,
    ),
    check(
      "inquiries_fields_check",
      sql`length(trim(${t.name})) between 1 and 200 and length(${t.email}) between 1 and 320 and ${t.email}=lower(${t.email}) and length(trim(${t.description})) between 20 and 5000 and (${t.company} is null or length(${t.company}) <= 200) and (${t.budget} is null or length(${t.budget}) <= 200)`,
    ),
    check(
      "inquiries_conversion_check",
      sql`(${t.status}='converted' and num_nonnulls(${t.convertedAt},${t.conversionKey},${t.conversionHash},${t.convertedClientId},${t.convertedContactId})=5) or (${t.status}<>'converted' and num_nonnulls(${t.convertedAt},${t.conversionKey},${t.conversionHash},${t.convertedClientId},${t.convertedContactId},${t.convertedNoteId})=0)`,
    ),
  ],
);

export const inquiryAlerts = studio.table(
  "inquiry_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("pending"),
    generation: integer("generation").notNull().default(1),
    attemptCount: integer("attempt_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseId: uuid("lease_id"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    firstAttemptedAt: timestamp("first_attempted_at", { withTimezone: true }),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    errorCode: text("error_code"),
    sender: text("sender"),
    recipient: text("recipient"),
    subject: text("subject"),
    body: text("body"),
    providerKey: text("provider_key"),
  },
  (t) => [
    unique("inquiry_alerts_inquiry_uq").on(t.inquiryId),
    check(
      "inquiry_alerts_state_check",
      sql`${t.state} in ('pending','sending','accepted','failed','unknown')`,
    ),
    check(
      "inquiry_alerts_attempt_check",
      sql`${t.generation}>0 and ${t.attemptCount}>=0`,
    ),
  ],
);

export const inquiryEvents = studio.table(
  "inquiry_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    actorUserId: uuid("actor_user_id").references(() => owners.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("inquiry_events_inquiry_idx").on(t.inquiryId),
    check(
      "inquiry_events_kind_check",
      sql`${t.kind} in ('submitted','reviewing','closed','reopened','converted','alert_retry')`,
    ),
  ],
);

export const inquiryRateWindows = studio.table(
  "inquiry_rate_windows",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    keyHash: text("key_hash").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.keyHash, t.windowStart] }),
    check("inquiry_rate_count_check", sql`${t.count}>0`),
  ],
);

export const inquiryMaintenance = studio.table(
  "inquiry_maintenance",
  {
    workspaceId: uuid("workspace_id")
      .primaryKey()
      .references(() => workspaces.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    deletedInquiries: integer("deleted_inquiries").notNull().default(0),
    deletedRateWindows: integer("deleted_rate_windows").notNull().default(0),
    errorCode: text("error_code"),
    outcome: text("outcome").notNull().default("never"),
  },
  (t) => [
    check(
      "inquiry_maintenance_counts_check",
      sql`${t.deletedInquiries}>=0 and ${t.deletedRateWindows}>=0`,
    ),
    check(
      "inquiry_maintenance_outcome_check",
      sql`${t.outcome} in ('never','complete','incomplete','failed')`,
    ),
  ],
);

// `('a', 'b')` written literally into the DDL. Check constraints cannot take bound parameters.
function inList(values: readonly string[]): SQL {
  return sql.raw(
    `(${values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ")})`,
  );
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

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();

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
    retentionHold: boolean("retention_hold").notNull().default(false),
    retentionHoldReason: text("retention_hold_reason"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("clients_status_check", oneOf(t.status, CLIENT_STATUSES)),
    check("clients_name_not_blank", notBlank(t.name)),
    check("clients_retention_hold_check", sql`(${t.retentionHold} and ${t.retentionHoldReason} is not null and ${t.retentionHoldReason} in ('contract','payment','dispute','other_business_need')) or (not ${t.retentionHold} and ${t.retentionHoldReason} is null)`),
    index("clients_retention_idx").on(t.workspaceId, t.archivedAt, t.id),
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
    retentionHold: boolean("retention_hold").notNull().default(false),
    retentionHoldReason: text("retention_hold_reason"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check(
      "contacts_preferred_channel_check",
      oneOf(t.preferredChannel, CONTACT_CHANNELS),
    ),
    check("contacts_full_name_not_blank", notBlank(t.fullName)),
    check("contacts_retention_hold_check", sql`(${t.retentionHold} and ${t.retentionHoldReason} is not null and ${t.retentionHoldReason} in ('contract','payment','dispute','other_business_need')) or (not ${t.retentionHold} and ${t.retentionHoldReason} is null)`),
    index("contacts_retention_idx").on(t.workspaceId, t.archivedAt, t.id),
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
    check(
      "projects_target_end_after_start",
      notBefore(t.targetEndDate, t.startDate),
    ),
    check(
      "projects_actual_end_after_start",
      notBefore(t.actualEndDate, t.startDate),
    ),
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
    // Spec 0008: private grouping; `standalone` is always equal to `layer = 'standalone'` (check below).
    layer: text("layer").$type<SystemLayer>().notNull().default("core"),
    // Spec 0008: only published live systems reach the public export. Off for new systems.
    published: boolean("published").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("systems_id_slug_check", sql`${t.id} ~ '^[a-z0-9-]+$'`),
    check("systems_status_check", oneOf(t.status, SYSTEM_STATUSES)),
    check("systems_name_not_blank", notBlank(t.name)),
    check("systems_layer_check", oneOf(t.layer, SYSTEM_LAYERS)),
    check(
      "systems_standalone_matches_layer",
      sql`${t.standalone} = (${t.layer} = 'standalone')`,
    ),
    index("systems_workspace_status_sort_idx").on(
      t.workspaceId,
      t.status,
      t.sortOrder,
    ),
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
    primaryKey({
      name: "project_systems_pk",
      columns: [t.projectId, t.systemId],
    }),
    index("project_systems_workspace_idx").on(t.workspaceId),
    index("project_systems_system_idx").on(t.systemId),
  ],
);

// Contract templates (spec 0007): a Markdown subset with {{placeholders}}, private to the workspace.
export const contractTemplates = studio.table(
  "contract_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    name: text("name").notNull(),
    description: text("description"),
    body: text("body").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("contract_templates_name_not_blank", notBlank(t.name)),
    check(
      "contract_templates_body_length",
      sql`char_length(${t.body}) <= 50000`,
    ),
    uniqueIndex("contract_templates_workspace_name_uq")
      .on(t.workspaceId, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} is null`),
    index("contract_templates_workspace_updated_idx").on(
      t.workspaceId,
      t.updatedAt.desc(),
    ),
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
    // Provenance only (spec 0007): never read to render. The body is this contract's own copy.
    templateId: uuid("template_id").references(() => contractTemplates.id, {
      onDelete: "restrict",
    }),
    body: text("body").notNull().default(""),
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
    check(
      "contracts_billing_cadence_check",
      oneOf(t.billingCadence, BILLING_CADENCES),
    ),
    check("contracts_title_not_blank", notBlank(t.title)),
    check("contracts_amount_not_negative", sql`${t.amountMinor} >= 0`),
    check("contracts_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("contracts_end_after_start", notBefore(t.endDate, t.startDate)),
    check("contracts_body_length", sql`char_length(${t.body}) <= 50000`),
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
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    note: text("note"),
    createdAt,
  },
  (t) => [
    check(
      "contract_status_events_from_status_check",
      oneOf(t.fromStatus, CONTRACT_STATUSES),
    ),
    check(
      "contract_status_events_to_status_check",
      oneOf(t.toStatus, CONTRACT_STATUSES),
    ),
    check(
      "contract_status_events_opening_is_draft",
      sql`${t.fromStatus} is not null or ${t.toStatus} = 'draft'`,
    ),
    check(
      "contract_status_events_from_to_differ",
      sql`${t.fromStatus} is distinct from ${t.toStatus}`,
    ),
    uniqueIndex("contract_status_events_one_opening_uq")
      .on(t.contractId)
      .where(sql`${t.fromStatus} is null`),
    index("contract_status_events_contract_changed_idx").on(
      t.contractId,
      t.changedAt,
    ),
    index("contract_status_events_workspace_idx").on(t.workspaceId),
  ],
);

// Append only (spec 0007): a trigger (custom migration) rejects any update or delete. The bytes live in private Blob.
export const contractFiles = studio.table(
  "contract_files",
  {
    id: uuid("id").primaryKey(),
    workspaceId: workspaceId(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "restrict" }),
    kind: text("kind").$type<ContractFileKind>().notNull(),
    statusEventId: uuid("status_event_id").references(
      () => contractStatusEvents.id,
      { onDelete: "restrict" },
    ),
    blobPathname: text("blob_pathname").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    createdAt,
  },
  (t) => [
    check("contract_files_kind_check", oneOf(t.kind, CONTRACT_FILE_KINDS)),
    check("contract_files_size_positive", sql`${t.sizeBytes} > 0`),
    check("contract_files_sha256_hex", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check(
      "contract_files_sent_pdf_has_event",
      sql`${t.kind} <> 'sent_pdf' or ${t.statusEventId} is not null`,
    ),
    uniqueIndex("contract_files_blob_pathname_uq").on(t.blobPathname),
    uniqueIndex("contract_files_status_event_uq")
      .on(t.statusEventId)
      .where(sql`${t.statusEventId} is not null`),
    index("contract_files_contract_kind_created_idx").on(
      t.contractId,
      t.kind,
      t.createdAt.desc(),
    ),
    index("contract_files_workspace_idx").on(t.workspaceId),
  ],
);

// Editable and hard deletable. Exactly one target per note.
export const notes = studio.table(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: workspaceId(),
    body: text("body").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "restrict",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    contractId: uuid("contract_id").references(() => contracts.id, {
      onDelete: "restrict",
    }),
    systemId: text("system_id").references(() => systems.id, {
      onDelete: "restrict",
    }),
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

// Studio login (spec 0005). The owner row and its membership are inserted by migration 0005.

export const owners = studio.table(
  "owners",
  {
    // Also the WebAuthn user handle: random looking, no personal data.
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: text("display_name").notNull(),
    ...timestamps,
  },
  (t) => [check("owners_display_name_not_blank", notBlank(t.displayName))],
);

export const workspaceMembers = studio.table(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull().default("owner"),
    createdAt,
  },
  (t) => [
    primaryKey({
      name: "workspace_members_pk",
      columns: [t.workspaceId, t.ownerId],
    }),
    check("workspace_members_role_check", oneOf(t.role, MEMBER_ROLES)),
    index("workspace_members_owner_idx").on(t.ownerId),
  ],
);

export const passkeys = studio.table(
  "passkeys",
  {
    // Credential id, base64url.
    id: text("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id, { onDelete: "cascade" }),
    // base64url of the COSE public key.
    publicKey: text("public_key").notNull(),
    counter: bigint("counter", { mode: "number" }).notNull().default(0),
    transports: text("transports").array(),
    deviceType: text("device_type").$type<PasskeyDeviceType>().notNull(),
    backedUp: boolean("backed_up").notNull(),
    nickname: text("nickname").notNull(),
    createdAt,
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [
    check("passkeys_counter_not_negative", sql`${t.counter} >= 0`),
    check(
      "passkeys_device_type_check",
      oneOf(t.deviceType, PASSKEY_DEVICE_TYPES),
    ),
    check("passkeys_nickname_not_blank", notBlank(t.nickname)),
    index("passkeys_owner_idx").on(t.ownerId),
  ],
);

// Only the SHA-256 hex of the cookie token is stored, never the token.
export const sessions = studio.table(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    ownerId: uuid("owner_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    deviceLabel: text("device_label"),
    createdAt,
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    // A session always belongs to a real membership.
    foreignKey({
      name: "sessions_membership_fk",
      columns: [t.workspaceId, t.ownerId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.ownerId],
    }).onDelete("cascade"),
    uniqueIndex("sessions_token_hash_uq").on(t.tokenHash),
    check(
      "sessions_expires_after_created",
      sql`${t.expiresAt} > ${t.createdAt}`,
    ),
    index("sessions_owner_idx").on(t.ownerId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

// One use each: a finish action deletes its row. Expired rows are deleted on every insert.
export const authChallenges = studio.table(
  "auth_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challenge: text("challenge").notNull(),
    purpose: text("purpose").$type<ChallengePurpose>().notNull(),
    ownerId: uuid("owner_id").references(() => owners.id, {
      onDelete: "cascade",
    }),
    createdAt,
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    check(
      "auth_challenges_purpose_check",
      oneOf(t.purpose, CHALLENGE_PURPOSES),
    ),
    index("auth_challenges_expires_idx").on(t.expiresAt),
  ],
);

// Kept 90 days. Never holds an IP address, a token, or a challenge.
export const authEvents = studio.table(
  "auth_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").$type<AuthEventKind>().notNull(),
    ownerId: uuid("owner_id").references(() => owners.id, {
      onDelete: "set null",
    }),
    // No FK, so history survives a passkey removal.
    passkeyId: text("passkey_id"),
    deviceLabel: text("device_label"),
    createdAt,
  },
  (t) => [
    check("auth_events_kind_check", oneOf(t.kind, AUTH_EVENT_KINDS)),
    index("auth_events_created_idx").on(t.createdAt),
    index("auth_events_kind_created_idx").on(t.kind, t.createdAt),
  ],
);
