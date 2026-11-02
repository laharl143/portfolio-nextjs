import { track } from "@vercel/analytics";

// Vercel Analytics custom events for the actions that signal recruiter and client interest.
// One named event per action type, so each shows as its own row in the dashboard.

// A section call to action uses its section id as its location; existing names never change (spec 0018).
export type ContactLocation = "hero" | "closing" | "header" | "mobile_nav" | "footer" | "services" | "ecosystem";

export const trackContactClick = (location: ContactLocation) =>
  track("contact_click", { location });

export const trackCvDownload = () => track("cv_download", { location: "hero" });

export const trackLinkClick = (
  kind: "project" | "certification",
  name: string,
) => track("link_click", { kind, name });
