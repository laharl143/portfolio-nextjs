import type { Metadata } from "next";
import Header from "@/sections/Header";
import Hero from "@/sections/Hero";
import Intro from "@/sections/Intro";
import Projects from "@/sections/Projects";
import Skills from "@/sections/Skills";
import Badges from "@/sections/Badges";
// import Testimonials from "@/sections/Testimonials";
import FAQs from "@/sections/FAQs";
import Footer from "@/sections/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { openGraphBase } from "@/lib/site";
import { profilePageJsonLd, toJsonLdString } from "@/lib/json-ld";
import { seo } from "../../../../utils/data/seo-data";

export const metadata: Metadata = {
  // Absolute, so the portfolio keeps its full title instead of the layout's "%s | Erskine Duenas" template (spec 0014, AC-3).
  title: { absolute: seo.personal.title },
  description: seo.personal.description,
  alternates: { canonical: "/personal" },
  openGraph: { ...openGraphBase, url: "/personal", title: seo.personal.title, description: seo.personal.description },
};

export default function Personal() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdString(profilePageJsonLd()) }} />
      <Header />
      <Hero />
      <Badges />
      <Intro />
      <Skills />
      <Projects />
      {/* <Testimonials /> */}
      <FAQs />
      <Footer />
      <ScrollToTop />
    </>
  );
}
