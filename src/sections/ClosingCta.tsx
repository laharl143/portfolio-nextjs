import { FC } from "react";
import ContactLink from "@/components/brand/ContactLink";
import { landingData } from "../../utils/data/landing-data";

const ClosingCta: FC = () => {
  const { label, heading, body } = landingData.closing;

  return (
    <section id="start" aria-labelledby="start-heading" className="section scroll-mt-20">
      <div className="container">
        <p className="brand-label text-muted-foreground">{label}</p>
        <h2 id="start-heading" className="brand-heading mt-2 max-w-4xl text-4xl md:text-6xl">
          {heading}
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{body}</p>
        <ContactLink location="closing" className="mt-10" />
      </div>
    </section>
  );
};

export default ClosingCta;
