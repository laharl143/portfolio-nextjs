import { renderBrandCard, OG_SIZE } from "@/lib/og-card";
import { seo } from "../../../../utils/data/seo-data";
import { brandData } from "../../../../utils/data/brand-data";

// Applies to / only: /products and /contact have their own cards.
export const alt = `${brandData.name}, ${seo.home.cardHeadline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBrandCard(seo.home.cardHeadline);
}
