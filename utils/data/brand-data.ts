// The business brand (spec 0015). Public content only: the wordmark, share cards, and brand pages read it.
// nav and footer feed the brand header and footer (spec 0016, AC-7 and AC-8).
// socials feed the hero (hero: true) and the brand footer icon row (spec 0017); the URLs live in personalData.
import { personalData } from "./personal-data";

export const brandData = {
  name: "ED Solutions",
  tagline: "Connected systems for small businesses",
  nav: [
    { label: "What I build", href: "/#services" },
    { label: "Products", href: "/products" },
    { label: "Contact", href: "/contact" },
  ],
  footer: {
    status: "Taking on new projects",
    employerLink: { label: "For employers: my portfolio", href: "/personal" },
    copyright: "Copyright © Erskine Duenas, ED Solutions • All rights reserved",
  },
  socials: [
    { platform: "linkedin", label: "LinkedIn", href: personalData.linkedIn, hero: true },
    { platform: "github", label: "GitHub", href: personalData.github, hero: true },
    { platform: "codewars", label: "Codewars", href: personalData.codewars },
    { platform: "monkeytype", label: "MonkeyType", href: personalData.monkeyType },
    { platform: "facebook", label: "Facebook", href: personalData.facebook },
  ],
} as const;
