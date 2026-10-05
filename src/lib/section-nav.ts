import type { MouseEvent } from "react";

// Smooth scrolls to a home page section when the link targets the current page.
// Otherwise it does nothing, so the browser navigates normally (e.g. "/#projects" from "/products").
export function scrollToSectionIfSamePage(e: MouseEvent<HTMLAnchorElement>) {
  const url = new URL(e.currentTarget.href);
  if (!url.hash || url.pathname !== window.location.pathname) return;

  const target = document.querySelector(url.hash);
  if (!target) return;

  e.preventDefault();
  target.scrollIntoView({ behavior: "smooth" });
}
