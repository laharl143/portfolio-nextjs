import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config.mjs";
import { PUBLIC_ROUTES } from "./site";
import { profilePageJsonLd } from "./json-ld";

describe("landing page at / and portfolio at /personal (spec 0014 AC-9, spec 0016 AC-12 and AC-16)", () => {
  it("lists /, then the other public routes", () => {
    expect(PUBLIC_ROUTES).toEqual(["/", "/personal", "/products", "/contact"]);
  });
  it("points the Person JSON-LD url at /personal", () => {
    expect(profilePageJsonLd().mainEntity.url).toBe("https://ed-solutions.dev/personal");
  });
  it("has no redirect for /", async () => {
    const redirects = nextConfig.redirects ? await nextConfig.redirects() : [];
    expect(redirects.filter((r) => r.source === "/")).toEqual([]);
  });
});
