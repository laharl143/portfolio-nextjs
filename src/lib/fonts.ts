import { Archivo } from "next/font/google";

// Shared by both root layouts, (site) and (studio) (spec 0003).
// The width axis loads for the brand's wide cuts (spec 0015); the default width stays 100.
export const archivo = Archivo({
  display: "swap",
  weight: "variable",
  axes: ["wdth"],
  subsets: ["latin"],
  variable: "--font-archivo",
});
