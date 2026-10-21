import { createHash } from "node:crypto";

export const NOTICE_VERSION = "lead-intake-v1";
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const STATUSES = ["new", "reviewing", "converted", "closed"] as const;
export type InquiryStatus = (typeof STATUSES)[number];
export class IntakeError extends Error {
  constructor(
    public code: string,
    public status = 422,
    public fieldErrors?: Record<string, string>,
  ) {
    super(code);
  }
}
export type Submission = {
  submissionKey: string;
  name: string;
  email: string;
  description: string;
  company: string | null;
  budget: string | null;
  noticeVersion: string;
  challengeToken: string;
};
export function text(
  value: unknown,
  field: string,
  max: number,
  min = 0,
  multiline = false,
): string {
  if (typeof value !== "string")
    throw new IntakeError("INVALID_INPUT", 422, {
      [field]: "Enter a valid value.",
    });
  const clean = value.trim();
  if (
    clean.length < min ||
    clean.length > max ||
    (multiline
      ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/
      : /[\x00-\x1f\x7f-\x9f]/
    ).test(clean)
  ) {
    throw new IntakeError("INVALID_INPUT", 422, {
      [field]: `Use ${min} to ${max} characters without control characters.`,
    });
  }
  return clean;
}
export function email(value: unknown): string {
  const clean = text(value, "email", 320, 1).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
    throw new IntakeError("INVALID_INPUT", 422, {
      email: "Enter a valid email address.",
    });
  return clean;
}
export function parseSubmission(value: unknown): Submission {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new IntakeError("INVALID_INPUT");
  const v = value as Record<string, unknown>;
  if (typeof v.submissionKey !== "string" || !UUID.test(v.submissionKey))
    throw new IntakeError("INVALID_KEY");
  if (v.acknowledged !== true || v.noticeVersion !== NOTICE_VERSION)
    throw new IntakeError("INVALID_INPUT", 422, {
      acknowledged: "Acknowledge the privacy notice.",
    });
  return {
    submissionKey: v.submissionKey,
    name: text(v.name, "name", 200, 1),
    email: email(v.email),
    description: text(v.description, "description", 5000, 20, true),
    company: text(v.company ?? "", "company", 200) || null,
    budget: text(v.budget ?? "", "budget", 200) || null,
    noticeVersion: NOTICE_VERSION,
    challengeToken: text(v.challengeToken ?? "", "challengeToken", 2048),
  };
}
export function hash(values: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}
export function payloadHash(s: Submission): string {
  return hash([
    s.name,
    s.email,
    s.description,
    s.company,
    s.budget,
    s.noticeVersion,
  ]);
}
export function conversionHash(
  mode: string,
  target: string,
  name: string,
  address: string,
): string {
  return hash([mode, target.trim(), name.trim(), address.trim().toLowerCase()]);
}
export function transitionAllowed(from: string, to: string): boolean {
  return (
    (
      {
        new: ["reviewing", "closed", "converted"],
        reviewing: ["closed", "converted"],
        closed: ["reviewing"],
        converted: [],
      } as Record<string, string[]>
    )[from]?.includes(to) ?? false
  );
}
