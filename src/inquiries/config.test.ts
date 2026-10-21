import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicIntakeConfig } from "./public-config";
import { getAlertConfig, getIntakeConfig, trustedAddress } from "./config";
afterEach(() => vi.unstubAllEnvs());
describe("AC-10, AC-11: fail closed configuration", () => {
  it("keeps preview disabled even with flags and exposes only safe fields", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("LEAD_INTAKE_ENABLED", "true");
    vi.stubEnv("TURNSTILE_SITE_KEY", "public-key");
    expect(getPublicIntakeConfig()).toEqual({ enabled: false, siteKey: "" });
    expect(() => getIntakeConfig()).toThrow();
  });
  it("requires complete configuration", () => {
    vi.stubEnv("LEAD_INTAKE_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(() => getIntakeConfig()).toThrow();
  });
  it("allows production owner alerts with public intake disabled and no Turnstile", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("LEAD_INTAKE_ENABLED", "false");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("RESEND_API_KEY", "fake-key");
    vi.stubEnv("INQUIRY_ALERT_FROM", "fake@example.invalid");
    vi.stubEnv("INQUIRY_ALERT_TO", "owner@example.invalid");
    expect(getAlertConfig()).toMatchObject({
      sender: "fake@example.invalid",
      recipient: "owner@example.invalid",
      resendKey: "fake-key",
    });
  });
  it("rejects missing, multiple, or arbitrary forwarded addresses", () => {
    expect(() =>
      trustedAddress(new Headers({ "x-forwarded-for": "1.2.3.4" })),
    ).toThrow();
    expect(() =>
      trustedAddress(
        new Headers({ "x-vercel-forwarded-for": "1.2.3.4,5.6.7.8" }),
      ),
    ).toThrow();
  });
});
