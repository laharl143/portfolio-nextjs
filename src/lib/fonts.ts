import { Archivo } from "next/font/google";

// Shared by both root layouts, (site) and (studio) (spec 0003).
export const archivo = Archivo({
  display: "swap",
  weight: "variable",
  subsets: ["latin"],
  variable: "--font-archivo",
});
