import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Never disallow /studio here: crawlers must reach its noindex meta and header (spec 0009, AC-7).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
