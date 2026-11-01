import type { MouseEvent } from "react";

// Smooth scrolls to a home page section when the link targets the current page.
// Otherwise it does nothing, so the browser navigates normally (e.g. "/personal#projects" from "/products").
export function scrollToSectionIfSamePage(e: MouseEvent<HTMLAnchorElement>) {
  const url = new URL(e.currentTarget.href);
  if (!url.hash || url.pathname !== window.location.pathname) return;

  const target = document.querySelector(url.hash);
  if (!target) return;

  e.preventDefault();
  target.scrollIntoView({ behavior: "smooth" });
}

// The /personal section ids that lived on / before the portfolio moved (spec 0016, AC-9).
// Never reuse one as an element id on /, or the forwarder would send that section's links away.
export const PERSONAL_SECTION_IDS = ["hero", "badges", "skills", "projects", "faqs", "contact"] as const;

// "#projects" → "/personal#projects"; any other hash, or none, stays on / (null).
export function legacyHashTarget(hash: string): string | null {
  const id = hash.replace(/^#/, "");
  return (PERSONAL_SECTION_IDS as readonly string[]).includes(id) ? `/personal#${id}` : null;
}
