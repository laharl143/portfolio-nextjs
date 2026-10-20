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
import { seo } from "../../../utils/data/seo-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraphBase, url: "/", title: seo.home.title, description: seo.home.description },
};

export default function Home() {
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
