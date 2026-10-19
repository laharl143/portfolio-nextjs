import type { SystemLinkState, SystemResourceKind, SystemStatus } from "@/studio/db/constants";

// Systems map labels (spec 0008). Status titles match `statusSections` in the public file.
export const SYSTEM_STATUS_LABELS: Record<SystemStatus, string> = {
  built: "Built",
  "in-progress": "In progress",
  next: "Up next",
  planned: "Planned",
};

export const LINK_STATE_LABELS: Record<SystemLinkState, string> = {
  live: "Live",
  planned: "Planned",
};

export const RESOURCE_KIND_LABELS: Record<SystemResourceKind, string> = {
  repo: "Repository",
  live: "Live site",
  docs: "Docs",
  board: "Board",
  other: "Other",
};
