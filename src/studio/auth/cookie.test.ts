import { afterEach, describe, expect, it, vi } from "vitest";
import { INQUIRY_SEARCH_COOKIE, inquirySearchCookieOptions } from "./cookie";
afterEach(() => {
  vi.unstubAllEnvs();
});
describe("AC-10: inbox search cookie", () => {
  it("keeps the term httpOnly, strict, scoped to the inbox, for 30 minutes", () => {
    expect(INQUIRY_SEARCH_COOKIE).toBe("studio_inquiry_q");
    expect(inquirySearchCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/studio/inquiries",
      maxAge: 30 * 60,
    });
  });
  it("takes a maxAge of 0 to clear the term", () => {
    expect(inquirySearchCookieOptions(0).maxAge).toBe(0);
  });
  it("is secure only on an https studio origin", () => {
    vi.stubEnv("STUDIO_ORIGIN", "https://example.test");
    expect(inquirySearchCookieOptions().secure).toBe(true);
    vi.stubEnv("STUDIO_ORIGIN", "http://localhost:3000");
    expect(inquirySearchCookieOptions().secure).toBe(false);
  });
});
