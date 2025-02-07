import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Erskine Duenas",
  description: "Created using NextJs",
};

const archivo = Archivo({
  display: "swap",
  weight: "variable",
  subsets: ["latin"],
  variable: "--font-archivo",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased bg-stone-200 text-stone-900 dark:bg-stone-900 dark:text-stone-100 ${archivo.variable} font-sans`}>
        <ThemeProvider attribute="class" enableSystem={false} defaultTheme="light">
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
