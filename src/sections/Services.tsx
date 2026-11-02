import { FC } from "react";
import ContactLink from "@/components/brand/ContactLink";
import { landingData } from "../../utils/data/landing-data";

const Services: FC = () => {
  const { label, heading, cards } = landingData.services;

  return (
    <section id="services" aria-labelledby="services-heading" className="section scroll-mt-20">
      <div className="container">
        <p className="brand-label text-muted-foreground">{label}</p>
        <h2 id="services-heading" className="brand-heading mt-2 text-4xl md:text-6xl">
          {heading}
        </h2>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map(({ title, body }) => (
            <li key={title} className="rounded-2xl bg-card p-8 text-card-foreground">
              <h3 className="brand-heading text-2xl">{title}</h3>
              <p className="mt-4 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
        <ContactLink location="services" variant="text" className="mt-10" />
      </div>
    </section>
  );
};

export default Services;
