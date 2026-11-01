// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const track = vi.fn();
vi.mock("@vercel/analytics", () => ({ track: (...args: unknown[]) => track(...args) }));

import ContactLink from "./ContactLink";

afterEach(() => {
  cleanup();
  track.mockReset();
});

describe("ContactLink (spec 0016, AC-3, AC-6)", () => {
  it.each(["hero", "closing"] as const)("links to /contact and records the %s location", (location) => {
    render(<ContactLink location={location} />);
    const link = screen.getByRole("link", { name: "Tell me about your project" });
    expect(link).toHaveAttribute("href", "/contact");
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith("contact_click", { location });
  });
});
