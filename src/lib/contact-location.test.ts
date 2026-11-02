// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("@vercel/analytics", () => ({ track: (...args: unknown[]) => track(...args) }));

import {
  CONTACT_LOCATION_STORAGE_KEY,
  CONTACT_LOCATION_TTL_MS,
  forgetContactLocation,
  readContactLocation,
} from "./contact-location";
import { trackContactClick } from "./analytics";

afterEach(() => {
  track.mockReset();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("spec 0020 AC-1: the click remembers its location", () => {
  it("stores the location on a click that goes to /contact, last click wins", () => {
    trackContactClick("hero");
    trackContactClick("footer");
    expect(track).toHaveBeenCalledWith("contact_click", { location: "footer" });
    expect(JSON.parse(sessionStorage.getItem(CONTACT_LOCATION_STORAGE_KEY)!)).toMatchObject({
      location: "footer",
    });
    expect(readContactLocation()).toBe("footer");
  });

  it("writes nothing for a click that stays on the page", () => {
    trackContactClick("mobile_nav", { navigates: false });
    expect(track).toHaveBeenCalledWith("contact_click", { location: "mobile_nav" });
    expect(sessionStorage.getItem(CONTACT_LOCATION_STORAGE_KEY)).toBeNull();
  });

  it("still tracks the click when storage throws, and reads as no location", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => trackContactClick("hero")).not.toThrow();
    expect(track).toHaveBeenCalledWith("contact_click", { location: "hero" });
    expect(readContactLocation()).toBeNull();
    expect(() => forgetContactLocation()).not.toThrow();
  });
});

describe("spec 0020 AC-2: the form reads only a fresh, known location", () => {
  it.each([
    ["a tampered location", JSON.stringify({ location: "<script>", at: Date.now() })],
    ["invalid JSON", "{not json"],
    ["a missing time", JSON.stringify({ location: "hero" })],
    ["a plain string", JSON.stringify("hero")],
  ])("treats %s as no location", (_case, raw) => {
    sessionStorage.setItem(CONTACT_LOCATION_STORAGE_KEY, raw);
    expect(readContactLocation()).toBeNull();
  });

  it("expires after 30 minutes", () => {
    vi.useFakeTimers();
    trackContactClick("services");
    vi.advanceTimersByTime(CONTACT_LOCATION_TTL_MS);
    expect(readContactLocation()).toBe("services");
    vi.advanceTimersByTime(1);
    expect(readContactLocation()).toBeNull();
  });

  it("forgets the location", () => {
    trackContactClick("ecosystem");
    forgetContactLocation();
    expect(readContactLocation()).toBeNull();
  });
});
