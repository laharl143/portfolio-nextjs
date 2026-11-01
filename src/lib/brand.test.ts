import { describe, expect, it } from "vitest";
import { PERSONAL_ICONS, PERSONAL_SITE_NAME, SITE_NAME, openGraphBase, personalOpenGraphBase } from "./site";
import { metadata as brandMetadata } from "@/app/(site)/(brand)/layout";
import { brandData } from "../../utils/data/brand-data";

describe("ED Solutions brand metadata (spec 0015)", () => {
  it("names the business pages ED Solutions and keeps the portfolio's name for /personal (AC-4, AC-7)", () => {
    expect(SITE_NAME).toBe("ED Solutions");
    expect(openGraphBase.siteName).toBe("ED Solutions");
    expect(PERSONAL_SITE_NAME).toBe("Erskine Duenas");
    expect(personalOpenGraphBase).toEqual({ ...openGraphBase, siteName: "Erskine Duenas" });
  });
  it("gives the brand group its own title template, site name, and icons (AC-4, AC-6)", () => {
    expect(brandMetadata.title).toEqual({ default: "ED Solutions", template: "%s | ED Solutions" });
    expect(brandMetadata.openGraph).toEqual(openGraphBase);
    expect(brandMetadata.icons).toEqual({
      icon: [{ url: "/icons/ed-solutions.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icons/ed-solutions-180.png", sizes: "180x180" }],
    });
  });
  it("links the old icon from its new path outside the brand (AC-7, AC-8)", () => {
    expect(PERSONAL_ICONS).toEqual({
      icon: [{ url: "/icons/erskine-duenas.ico", type: "image/x-icon", sizes: "any" }],
    });
  });
  it("holds the wordmark name and tagline as public data", () => {
    expect(brandData.name).toBe("ED Solutions");
    expect(brandData.tagline).toBe("Connected systems for small businesses");
  });
  it("gives the brand header and footer their links and copy (spec 0016, AC-7, AC-8)", () => {
    expect(brandData.nav).toEqual([
      { label: "What I build", href: "/#services" },
      { label: "Products", href: "/products" },
      { label: "Contact", href: "/contact" },
    ]);
    expect(brandData.footer).toEqual({
      status: "Taking on new projects",
      employerLink: { label: "For employers: my portfolio", href: "/personal" },
      copyright: "Copyright © Erskine Duenas, ED Solutions • All rights reserved",
    });
  });
});
