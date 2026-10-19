import type { Metadata } from "next";
import "../globals.css";
import AppProviders from "@/components/AppProviders";
import { archivo } from "@/lib/fonts";
import { requireStudioAccess } from "@/studio/guard";

// Studio root layout (spec 0003): no public Header or Footer, no Analytics, never indexed, never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireStudioAccess();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased bg-stone-200 text-stone-900 dark:bg-stone-900 dark:text-stone-100 ${archivo.variable} font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
