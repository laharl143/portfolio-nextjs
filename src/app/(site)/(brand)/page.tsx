import type { Metadata } from "next";
import Header from "@/sections/Header";
import LandingHero from "@/sections/LandingHero";
import Services from "@/sections/Services";
import ProductsTeaser from "@/sections/ProductsTeaser";
import ClosingCta from "@/sections/ClosingCta";
import Footer from "@/sections/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import LegacyHashForward from "@/components/LegacyHashForward";
import { openGraphBase } from "@/lib/site";
import { organizationJsonLd, toJsonLdString } from "@/lib/json-ld";
import { seo } from "../../../../utils/data/seo-data";

export const metadata: Metadata = {
  // Absolute, so the brand layout's "%s | ED Solutions" template does not repeat the name (spec 0016, AC-10).
  title: { absolute: seo.home.title },
  description: seo.home.description,
  alternates: { canonical: "/" },
  openGraph: { ...openGraphBase, url: "/", title: seo.home.title, description: seo.home.description },
};

// The ED Solutions landing page (spec 0016). Section ids never reuse the /personal ids in PERSONAL_SECTION_IDS.
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdString(organizationJsonLd()) }} />
      <LegacyHashForward />
      <Header variant="brand" />
      <main>
        <LandingHero />
        <Services />
        {/* Feature 40: the Vital Stats case study, section id "story". */}
        {/* Feature 38: selected projects with outcomes, section id "work". */}
        <ProductsTeaser />
        {/* Feature 39: business FAQs, section id "questions". */}
        <ClosingCta />
      </main>
      <Footer variant="brand" />
      <ScrollToTop variant="brand" />
    </>
  );
}
