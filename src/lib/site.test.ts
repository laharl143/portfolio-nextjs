import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config.mjs";
import { PUBLIC_ROUTES } from "./site";
import { profilePageJsonLd } from "./json-ld";

describe("portfolio at /personal (spec 0014, AC-9)", () => {
  it("lists /personal, not /, as a public route", () => {
    expect(PUBLIC_ROUTES).toEqual(["/personal", "/products", "/contact"]);
  });
  it("points the Person JSON-LD url at /personal", () => {
    expect(profilePageJsonLd().mainEntity.url).toBe("https://ed-solutions.dev/personal");
  });
  it("redirects / to /personal temporarily", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: "/", destination: "/personal", permanent: false });
  });
});
