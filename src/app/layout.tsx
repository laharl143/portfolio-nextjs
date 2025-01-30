import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

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
    <html lang="en">
      <body className={`antialiased bg-stone-200 text-stone-900 ${archivo.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
