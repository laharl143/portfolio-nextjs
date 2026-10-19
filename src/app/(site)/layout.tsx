import type { Metadata } from "next";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import AppProviders from "@/components/AppProviders";
import { archivo } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Erskine Duenas",
  description: "Created using NextJs",
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
