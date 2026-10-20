import { renderShareCard } from "@/lib/og-card";
import { seo } from "../../../../utils/data/seo-data";

// Stable URL for the JSON-LD image (spec 0009, AC-8). The opengraph-image path carries a build hash inside a
// route group, so nothing may hardcode it. Replace with a real headshot in public/ when there is one.
export const dynamic = "force-static";

export function GET() {
  return renderShareCard(seo.home.cardHeadline);
}
