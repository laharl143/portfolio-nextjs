import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/site";

// Public routes only (spec 0009, AC-6). The studio is never listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({ url: new URL(path, SITE_URL).href }));
}
