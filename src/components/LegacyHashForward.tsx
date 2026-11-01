"use client";

import { useEffect } from "react";
import { legacyHashTarget } from "@/lib/section-nav";

// Sends old /#projects style links on to /personal#projects (spec 0016, AC-9).
// replace(), so Back skips the landing page instead of bouncing forward again.
export default function LegacyHashForward() {
  useEffect(() => {
    const target = legacyHashTarget(window.location.hash);
    if (target) window.location.replace(target);
  }, []);
  return null;
}
