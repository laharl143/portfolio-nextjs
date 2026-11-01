import { describe, expect, it } from "vitest";
import { organizationJsonLd, toJsonLdString } from "./json-ld";

describe("organizationJsonLd (spec 0016, AC-11)", () => {
  it("describes ED Solutions and its founder with public fields only", () => {
    expect(organizationJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ED Solutions",
      url: "https://ed-solutions.dev/",
      logo: "https://ed-solutions.dev/icons/ed-solutions-180.png",
      description: "Connected systems for small businesses",
      founder: { "@type": "Person", name: "Erskine Duenas", url: "https://ed-solutions.dev/personal" },
    });
  });
  it("carries no email, phone, or address", () => {
    const json = toJsonLdString(organizationJsonLd());
    expect(json).not.toMatch(/@[a-z0-9-]+\.[a-z]|tel:|telephone|email|address/i);
  });
});
