// Public site config (spec 0009). Not content: titles and descriptions live in utils/data/seo-data.ts.
// On a custom domain, change SITE_URL here; canonicals, the sitemap, and the JSON-LD all follow it.
export const SITE_URL = "https://ed-solutions.dev";
// The business brand names the business pages; /personal keeps the person's name (spec 0015).
export const SITE_NAME = "ED Solutions";
export const PERSONAL_SITE_NAME = "Erskine Duenas";
export const SITE_LOCALE = "en_US";

// The only source for the sitemap. A /studio path never goes here.
export const PUBLIC_ROUTES = ["/", "/personal", "/products", "/contact"] as const;

// Shared Open Graph fields. A page level openGraph replaces the layout's whole object, so pages spread this first.
export const openGraphBase = {
  type: "website",
  siteName: SITE_NAME,
  locale: SITE_LOCALE,
} as const;

// The same fields for /personal and the parts of the site outside the brand.
export const personalOpenGraphBase = { ...openGraphBase, siteName: PERSONAL_SITE_NAME } as const;

// The old icon, linked by every layout outside the brand (spec 0015, AC-7 to AC-9).
export const PERSONAL_ICONS = {
  icon: [{ url: "/icons/erskine-duenas.ico", type: "image/x-icon", sizes: "any" }],
};
