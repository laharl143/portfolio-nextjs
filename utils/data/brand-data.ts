// The business brand (spec 0015). Public content only: the wordmark, share cards, and brand pages read it.
// nav and footer feed the brand header and footer (spec 0016, AC-7 and AC-8).
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
} as const;
