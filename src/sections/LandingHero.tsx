import { FC } from "react";
import ContactLink from "@/components/brand/ContactLink";
import { landingData } from "../../utils/data/landing-data";

// Static in feature 33; feature 34 adds the motion, portrait, and socials (spec 0016).
const LandingHero: FC = () => {
  const { headline, stance, credibility } = landingData.hero;

  return (
    <section
      id="pitch"
      aria-labelledby="pitch-heading"
      className="scroll-mt-20 flex min-h-[100svh] items-center pt-28 pb-16 md:pt-32"
    >
      <div className="container">
        <h1 id="pitch-heading" className="brand-heading max-w-5xl text-5xl md:text-7xl lg:text-8xl">
          {headline}
        </h1>
        <p className="mt-8 max-w-3xl text-lg md:text-2xl text-muted-foreground">{stance}</p>
        <p className="brand-label mt-6 text-muted-foreground">{credibility}</p>
        <ContactLink location="hero" className="mt-10" />
      </div>
    </section>
  );
};

export default LandingHero;
