import { FC, Fragment, type CSSProperties } from "react";
import ContactLink from "@/components/brand/ContactLink";
import LandingPortrait from "@/components/brand/LandingPortrait";
import SocialIconLink from "@/components/brand/SocialIconLink";
import { brandData } from "../../utils/data/brand-data";
import { landingData } from "../../utils/data/landing-data";

const chevron = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const index = (i: number) => ({ "--i": i }) as CSSProperties;

// A server component (spec 0017): the word reveal and rise are CSS only, so the text never waits for JavaScript.
// Only LandingPortrait is client code, for the scroll zoom.
// On short desktop viewports (laptops at 768 to 860px tall) the padding and headline tighten so the copy fits
// the first viewport and the scroll hint shows at its bottom, below the button (AC-6).
const LandingHero: FC = () => {
  const { headline, stance, credibility, scrollHint } = landingData.hero;
  const words = headline.split(" ");
  const heroSocials = brandData.socials.filter((social) => "hero" in social && social.hero);

  return (
    <section
      id="pitch"
      aria-labelledby="pitch-heading"
      className="relative scroll-mt-20 flex min-h-[100svh] items-center pt-28 pb-16 md:pt-32 md:pb-28 [@media(min-width:768px)_and_(max-height:860px)]:pt-24 [@media(min-width:768px)_and_(max-height:860px)]:pb-24"
    >
      <div className="container grid gap-12 md:grid-cols-12 md:items-center md:gap-8">
        <div className="md:col-span-7">
          <h1 id="pitch-heading" className="brand-heading text-5xl md:text-6xl lg:text-7xl [@media(min-width:768px)_and_(max-height:860px)]:lg:text-6xl">
            {words.map((word, i) => (
              <Fragment key={i}>
                <span className="brand-reveal-word" style={index(i)}>
                  {word}
                </span>
                {i < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p className="brand-rise mt-8 max-w-3xl text-lg md:text-2xl text-muted-foreground">{stance}</p>
          <p className="brand-rise brand-label mt-6 text-muted-foreground">{credibility}</p>
          <div className="brand-rise mt-10 flex flex-wrap items-center gap-4">
            <ContactLink location="hero" />
            <ul className="flex gap-3">
              {heroSocials.map((social) => (
                <li key={social.platform}>
                  <SocialIconLink social={social} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="md:col-span-5">
          <LandingPortrait />
        </div>
      </div>
      {/* Anchored in the hero's bottom padding: the first viewport's bottom when the copy fits, and never over the button when it runs taller. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground md:flex"
      >
        <span className="brand-label">{scrollHint}</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="brand-scroll-chevron -my-1.5" style={index(i)}>
            {chevron}
          </span>
        ))}
      </div>
    </section>
  );
};

export default LandingHero;
