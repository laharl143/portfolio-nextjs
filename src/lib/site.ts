// Public site config (spec 0009). Not content: titles and descriptions live in utils/data/seo-data.ts.
// On a custom domain, change SITE_URL here; canonicals, the sitemap, and the JSON-LD all follow it.
export const SITE_URL = "https://erskine.vercel.app";
export const SITE_NAME = "Erskine Duenas";
export const SITE_LOCALE = "en_US";

// The only source for the sitemap. A /studio path never goes here.
export const PUBLIC_ROUTES = ["/", "/products", "/contact"] as const;

// Shared Open Graph fields. A page level openGraph replaces the layout's whole object, so pages spread this first.
export const openGraphBase = {
  type: "website",
  siteName: SITE_NAME,
  locale: SITE_LOCALE,
} as const;
