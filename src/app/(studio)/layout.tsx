import type { Metadata } from "next";
import "../globals.css";
import AppProviders from "@/components/AppProviders";
import { archivo } from "@/lib/fonts";
import { PERSONAL_ICONS } from "@/lib/site";
import { requireStudioEnabled } from "@/studio/guard";

// Studio root layout (spec 0003): no public Header or Footer, no Analytics, never indexed, never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
  icons: PERSONAL_ICONS,
};

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Flag only: the login and setup pages live under this layout. Signed in pages are guarded by (signed-in)/layout.tsx.
  await requireStudioEnabled();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased bg-stone-200 text-stone-900 dark:bg-stone-900 dark:text-stone-100 ${archivo.variable} font-sans`}>
        <AppProviders defaultTheme="light">{children}</AppProviders>
      </body>
    </html>
  );
}
