import { describe, expect, it } from "vitest";
import { PERSONAL_SECTION_IDS, legacyHashTarget } from "./section-nav";

describe("legacyHashTarget (spec 0016, AC-9)", () => {
  it.each(PERSONAL_SECTION_IDS)("forwards #%s to /personal", (id) => {
    expect(legacyHashTarget(`#${id}`)).toBe(`/personal#${id}`);
  });
  it("covers the six portfolio ids", () => {
    expect(PERSONAL_SECTION_IDS).toEqual(["hero", "badges", "skills", "projects", "faqs", "contact"]);
  });
  it.each(["#services", "#pitch", "#unknown", "#", ""])("keeps %j on /", (hash) => {
    expect(legacyHashTarget(hash)).toBeNull();
  });
});
