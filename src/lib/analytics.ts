import { track } from "@vercel/analytics";

// Vercel Analytics custom events for the actions that signal recruiter interest.
// One named event per action type, so each shows as its own row in the dashboard.

export type ContactLocation = "header" | "mobile_nav" | "footer";

export const trackContactClick = (location: ContactLocation) =>
  track("contact_click", { location });

export const trackCvDownload = () => track("cv_download", { location: "hero" });

export const trackLinkClick = (
  kind: "project" | "certification",
  name: string,
) => track("link_click", { kind, name });
