import { renderBrandCard, OG_SIZE } from "@/lib/og-card";
import { seo } from "../../../../../utils/data/seo-data";
import { brandData } from "../../../../../utils/data/brand-data";

export const alt = `${brandData.name}, ${seo.contact.cardHeadline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderBrandCard(seo.contact.cardHeadline);
}
