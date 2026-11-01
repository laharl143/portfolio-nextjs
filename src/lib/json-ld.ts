import { personalData } from "../../utils/data/personal-data";
import { brandData } from "../../utils/data/brand-data";
import { SITE_URL } from "@/lib/site";

// ProfilePage with a Person (spec 0009, AC-8). Only public profile fields: no email, phone, address, or employer.
export function profilePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: personalData.name,
      jobTitle: personalData.designation,
      url: new URL("/personal", SITE_URL).href,
      image: `${SITE_URL}/profile-image`,
      sameAs: [personalData.github, personalData.linkedIn],
    },
  };
}

// Organization for the landing page (spec 0016, AC-11). Public fields only: no email, phone, or address.
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandData.name,
    url: new URL("/", SITE_URL).href,
    logo: new URL("/icons/ed-solutions-180.png", SITE_URL).href,
    description: brandData.tagline,
    founder: {
      "@type": "Person",
      name: personalData.name,
      url: new URL("/personal", SITE_URL).href,
    },
  };
}

// Escapes "<" so the string can never close the script tag it sits in (AC-9).
export function toJsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
