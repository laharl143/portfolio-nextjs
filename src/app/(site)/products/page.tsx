import type { Metadata } from "next";
import Header from "@/sections/Header";
import Products from "@/sections/Products";
import Footer from "@/sections/Footer";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: "Products | Erskine Duenas",
  description:
    "The products Erskine Duenas has built, is building, and plans for small and medium businesses, and how they connect.",
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
