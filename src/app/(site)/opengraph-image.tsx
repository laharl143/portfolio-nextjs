import { renderShareCard, OG_SIZE } from "@/lib/og-card";
import { seo } from "../../../utils/data/seo-data";

export const alt = `Erskine Duenas, ${seo.home.cardHeadline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderShareCard(seo.home.cardHeadline);
}
