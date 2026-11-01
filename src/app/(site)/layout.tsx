import type { Metadata } from "next";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { archivo } from "@/lib/fonts";
import { PERSONAL_ICONS, PERSONAL_SITE_NAME, SITE_URL, personalOpenGraphBase } from "@/lib/site";
import { seo } from "../../../utils/data/seo-data";

// Site wide SEO defaults (spec 0009). Pages add their own canonical and Open Graph url, title, and description.
// The theme provider lives one level down, per group (spec 0015): personal/layout.tsx, not-found.tsx, and (brand)/layout.tsx.
// A new page directly under (site) outside those must wrap itself in AppProviders, or its theme toggle does nothing.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: seo.personal.title, template: `%s | ${PERSONAL_SITE_NAME}` },
  description: seo.personal.description,
  openGraph: personalOpenGraphBase,
  twitter: { card: "summary_large_image" },
  icons: PERSONAL_ICONS,
};

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased bg-stone-200 text-stone-900 dark:bg-stone-900 dark:text-stone-100 ${archivo.variable} font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
