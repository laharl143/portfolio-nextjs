// Allowed value lists for every studio status and kind column (spec 0004).
// The single source for both the check constraints in ./schema.ts and the TypeScript unions.
// A plain module with no "server-only" import, because drizzle-kit loads it through schema.ts.

export const CLIENT_STATUSES = ["lead", "active", "past"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CONTACT_CHANNELS = ["email", "phone", "viber", "whatsapp", "other"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const PROJECT_STATUSES = ["planned", "active", "on_hold", "done", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// The same values as the public ProductStatus in utils/data/products-data.ts.
export const SYSTEM_STATUSES = ["built", "in-progress", "next", "planned"] as const;
export type SystemStatus = (typeof SYSTEM_STATUSES)[number];

export const CONTRACT_STATUSES = ["draft", "sent", "signed", "active", "ended", "cancelled"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const BILLING_CADENCES = ["one_time", "monthly", "milestone"] as const;
export type BillingCadence = (typeof BILLING_CADENCES)[number];

export const SYSTEM_LINK_STATES = ["live", "planned"] as const;
export type SystemLinkState = (typeof SYSTEM_LINK_STATES)[number];

export const SYSTEM_RESOURCE_KINDS = ["repo", "live", "docs", "board", "other"] as const;
export type SystemResourceKind = (typeof SYSTEM_RESOURCE_KINDS)[number];
