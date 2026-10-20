import type { Metadata } from "next";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import AppProviders from "@/components/AppProviders";
import { archivo } from "@/lib/fonts";
import { SITE_NAME, SITE_URL, openGraphBase } from "@/lib/site";
import { seo } from "../../../utils/data/seo-data";

// Site wide SEO defaults (spec 0009). Pages add their own canonical and Open Graph url, title, and description.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: seo.home.title, template: `%s | ${SITE_NAME}` },
  description: seo.home.description,
  openGraph: openGraphBase,
  twitter: { card: "summary_large_image" },
};

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased bg-stone-200 text-stone-900 dark:bg-stone-900 dark:text-stone-100 ${archivo.variable} font-sans`}>
        <AppProviders>
          {children}
          <Analytics />
        </AppProviders>
      </body>
    </html>
  );
}
