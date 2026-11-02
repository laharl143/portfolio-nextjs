// The call to action locations that lead to /contact, and the tab scoped handoff that carries one to the form (spec 0020).
// One list drives the contact_click event, the form, the server allowlist, and the studio labels.
// Dependency free: public code and src/inquiries import it, and it never imports from src/studio or src/inquiries.

// A section call to action uses its section id as its location; existing names never change (spec 0018).
export const CONTACT_LOCATIONS = [
  "hero",
  "closing",
  "header",
  "mobile_nav",
  "footer",
  "services",
  "ecosystem",
] as const;
export type ContactLocation = (typeof CONTACT_LOCATIONS)[number];

export const isContactLocation = (value: unknown): value is ContactLocation =>
  typeof value === "string" && (CONTACT_LOCATIONS as readonly string[]).includes(value);

export const CONTACT_LOCATION_STORAGE_KEY = "ed:contact-location";
export const CONTACT_LOCATION_TTL_MS = 30 * 60 * 1000;

// Storage can be missing or throw (private mode, blocked site data); a click or the form never fails because of it.
export function rememberContactLocation(location: ContactLocation) {
  try {
    sessionStorage.setItem(
      CONTACT_LOCATION_STORAGE_KEY,
      JSON.stringify({ location, at: Date.now() }),
    );
  } catch {}
}

// Missing, invalid JSON, an unknown location, or older than the TTL all read as no location.
export function readContactLocation(): ContactLocation | null {
  try {
    const raw = sessionStorage.getItem(CONTACT_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { location, at } = value as { location?: unknown; at?: unknown };
    if (!isContactLocation(location) || typeof at !== "number") return null;
    const age = Date.now() - at;
    return age >= 0 && age <= CONTACT_LOCATION_TTL_MS ? location : null;
  } catch {
    return null;
  }
}

export function forgetContactLocation() {
  try {
    sessionStorage.removeItem(CONTACT_LOCATION_STORAGE_KEY);
  } catch {}
}

// Studio "Source" row labels.
export const CONTACT_LOCATION_LABELS: Record<ContactLocation, string> = {
  hero: "Hero call to action",
  closing: "Closing call to action",
  header: "Header Contact Me",
  mobile_nav: "Mobile menu",
  footer: "Footer Contact Me",
  services: "Services section",
  ecosystem: "Products teaser",
};
