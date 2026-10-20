import { personalData } from "../../utils/data/personal-data";
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
      url: SITE_URL,
      image: `${SITE_URL}/profile-image`,
      sameAs: [personalData.github, personalData.linkedIn],
    },
  };
}

// Escapes "<" so the string can never close the script tag it sits in (AC-9).
export function toJsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
