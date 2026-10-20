// Search and share copy for the public pages (spec 0009). Page metadata and the share cards both read it.
export type PageSeo = {
  title: string;
  description: string;
  cardHeadline: string;
};

export const seo = {
  home: {
    title: "Erskine Duenas | Software Engineer and Aspiring Architect",
    description:
      "Erskine Duenas, software engineer at IBM. Architecting systems end to end, back-end focused and full-stack capable: Java, Spring Boot, React, and Next.js.",
    cardHeadline: "Architecting systems end to end",
  },
  products: {
    title: "Products",
    description:
      "The products Erskine Duenas has built, is building, and plans for small and medium businesses, and how they connect.",
    cardHeadline: "Products for small and medium businesses",
  },
} satisfies Record<string, PageSeo>;
