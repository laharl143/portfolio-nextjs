import Header from "@/sections/Header";
import Hero from "@/sections/Hero";
import Intro from "@/sections/Intro";
import Projects from "@/sections/Projects";
import Skills from "@/sections/Skills";
// import Testimonials from "@/sections/Testimonials";
import FAQs from "@/sections/FAQs";
import Footer from "@/sections/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <Intro />
      <Skills />
      <Projects />
      {/* <Testimonials /> */}
      <FAQs />
      <Footer />
    </>
  );
}
