import type { Metadata } from "next";
import AppProviders from "@/components/AppProviders";
import { SITE_NAME, openGraphBase } from "@/lib/site";

// The ED Solutions business pages (spec 0015): brand tokens, dark default, brand title, site name, and icons.
// The only place .brand is applied. A portal on a brand page must render inside this wrapper, or it loses the tokens.
export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  openGraph: openGraphBase,
  icons: {
    icon: [{ url: "/icons/ed-solutions.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/ed-solutions-180.png", sizes: "180x180" }],
  },
};

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders defaultTheme="dark">
      <div className="brand brand-surface min-h-screen bg-background text-foreground">{children}</div>
    </AppProviders>
  );
}
