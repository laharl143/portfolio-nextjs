"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/Button";
import { focusRing } from "@/lib/utils";
import { trackContactClick, type ContactLocation } from "@/lib/analytics";
import { landingData } from "../../../utils/data/landing-data";

const arrow = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    className="size-6"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
);

// Every landing page call to action to /contact goes through here, so each click records where it came from (spec 0016).
// A real link, so it still reaches /contact with JavaScript off; only the tracking is lost then.
export default function ContactLink({ location, className }: { location: ContactLocation; className?: string }) {
  return (
    <Link
      href="/contact"
      onClick={() => trackContactClick(location)}
      className={buttonClassName(
        "pill",
        // The label wraps to two lines at 375px, so the pill grows with it instead of keeping the fixed button height.
        // The lift and arrow slide stop under reduced motion; the color swap stays (spec 0017, AC-7 and AC-8).
        `h-auto min-h-11 py-2.5 text-left motion-safe:hover:-translate-y-0.5 ${focusRing} ${className ?? ""}`,
      )}
    >
      <span>{landingData.ctaLabel}</span>
      <span className="size-6 overflow-hidden">
        <span className="w-12 h-6 flex transition-transform duration-300 group-hover/button:-translate-x-1/2 motion-reduce:transition-none motion-reduce:group-hover/button:translate-x-0">
          {arrow}
          {arrow}
        </span>
      </span>
    </Link>
  );
}
