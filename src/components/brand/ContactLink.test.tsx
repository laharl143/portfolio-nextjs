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

describe("ContactLink section variant (spec 0018, AC-1 to AC-4)", () => {
  it.each(["services", "ecosystem"] as const)("links to /contact and records the %s location", (location) => {
    render(<ContactLink location={location} variant="text" />);
    const link = screen.getByRole("link", { name: "Tell me about your project" });
    expect(link).toHaveAttribute("href", "/contact");
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith("contact_click", { location });
  });

  it("renders the text look as an underlined link, not a pill", () => {
    render(<ContactLink location="services" variant="text" />);
    const link = screen.getByRole("link", { name: "Tell me about your project" });
    expect(link).toHaveClass("underline", "hover:text-signal");
    expect(link).not.toHaveClass("rounded-full", "bg-primary", "border");
  });

  it("keeps the pill look when no variant is given", () => {
    render(<ContactLink location="hero" />);
    expect(screen.getByRole("link", { name: "Tell me about your project" })).toHaveClass("rounded-full", "bg-primary");
  });
});
