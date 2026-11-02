// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// The portrait is client code with a static image import; its zoom is covered in e2e/landing.spec.ts.
vi.mock("@/components/brand/LandingPortrait", () => ({ default: () => <div data-testid="portrait" /> }));
vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import LandingHero from "./LandingHero";
import { landingData } from "../../utils/data/landing-data";
import { personalData } from "../../utils/data/personal-data";

afterEach(cleanup);

describe("LandingHero (spec 0017)", () => {
  it("renders one h1 whose text is the headline, split into reveal word spans (AC-1, AC-2)", () => {
    const { container } = render(<LandingHero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(landingData.hero.headline, { normalizeWhitespace: false });
    expect(h1.textContent).toBe(landingData.hero.headline);
    const words = h1.querySelectorAll(".brand-reveal-word");
    expect(Array.from(words, (w) => w.textContent)).toEqual(landingData.hero.headline.split(" "));
    expect((words[2] as HTMLElement).style.getPropertyValue("--i")).toBe("2");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("puts LinkedIn and GitHub after the button, opening in a new tab (AC-4)", () => {
    render(<LandingHero />);
    const button = screen.getByRole("link", { name: "Tell me about your project" });
    const row = button.parentElement!;
    const socials = within(row).getAllByRole("link").slice(1);
    expect(socials.map((link) => link.getAttribute("aria-label"))).toEqual([
      "LinkedIn (opens in a new tab)",
      "GitHub (opens in a new tab)",
    ]);
    expect(socials.map((link) => link.getAttribute("href"))).toEqual([personalData.linkedIn, personalData.github]);
    for (const link of socials) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("renders the scroll hint hidden from assistive tech (AC-6)", () => {
    const { container } = render(<LandingHero />);
    const hint = container.querySelector(".brand-scroll-chevron")!.parentElement!;
    expect(hint).toHaveAttribute("aria-hidden", "true");
    expect(hint).toHaveTextContent(landingData.hero.scrollHint);
    expect(hint.querySelectorAll(".brand-scroll-chevron")).toHaveLength(3);
  });
});
