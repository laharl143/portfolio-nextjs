import { track } from "@vercel/analytics";
import { rememberContactLocation, type ContactLocation } from "@/lib/contact-location";

// Vercel Analytics custom events for the actions that signal recruiter and client interest.
// One named event per action type, so each shows as its own row in the dashboard.

export type { ContactLocation };

// A click that goes to /contact also remembers its location for the form (spec 0020); one that stays on the page does not.
export const trackContactClick = (
  location: ContactLocation,
  { navigates = true }: { navigates?: boolean } = {},
) => {
  track("contact_click", { location });
  if (navigates) rememberContactLocation(location);
};

export const trackCvDownload = () => track("cv_download", { location: "hero" });

export const trackLinkClick = (
  kind: "project" | "certification",
  name: string,
) => track("link_click", { kind, name });

// Inquiry funnel events carry fixed codes only, never anything typed into the form (spec 0020, AC-6).
export type InquiryLocation = ContactLocation | "direct";
export type InquiryFailure = "validation" | "challenge" | "rate_limited" | "server" | "network";

export const trackInquiryStart = (location: InquiryLocation) =>
  track("inquiry_start", { location });

export const trackInquirySent = (location: InquiryLocation) =>
  track("inquiry_sent", { location });

export const trackInquiryFailed = (location: InquiryLocation, reason: InquiryFailure) =>
  track("inquiry_failed", { location, reason });
