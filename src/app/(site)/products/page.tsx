import type { Metadata } from "next";
import Header from "@/sections/Header";
import Products from "@/sections/Products";
import Footer from "@/sections/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { SITE_NAME, openGraphBase } from "@/lib/site";
import { seo } from "../../../../utils/data/seo-data";

export const metadata: Metadata = {
  title: seo.products.title,
  description: seo.products.description,
  alternates: { canonical: "/products" },
  openGraph: {
    ...openGraphBase,
    url: "/products",
    title: `${seo.products.title} | ${SITE_NAME}`,
    description: seo.products.description,
  },
};

export default function ProductsPage() {
  return (
    <>
      <Header />
      <main>
        <Products />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
