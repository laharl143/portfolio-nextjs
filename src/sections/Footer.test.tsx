// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useTextRevealAnimation", () => ({
  default: () => ({ scope: { current: null }, entranceAnimation: vi.fn() }),
}));
vi.mock("motion/react", () => ({ useInView: () => false }));
vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import Footer from "./Footer";
import { personalData } from "../../utils/data/personal-data";

afterEach(cleanup);

describe("Footer social links (spec 0017, AC-5)", () => {
  it("shows all five socials in order in the brand variant", () => {
    render(<Footer variant="brand" />);
    const links = within(screen.getByRole("list", { name: "Social links" })).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "LinkedIn (opens in a new tab)",
      "GitHub (opens in a new tab)",
      "Codewars (opens in a new tab)",
      "MonkeyType (opens in a new tab)",
      "Facebook (opens in a new tab)",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      personalData.linkedIn,
      personalData.github,
      personalData.codewars,
      personalData.monkeyType,
      personalData.facebook,
    ]);
    for (const link of links) expect(link).toHaveAttribute("target", "_blank");
  });

  it("leaves the personal footer without the social row (AC-9)", () => {
    render(<Footer />);
    expect(screen.queryByRole("list", { name: "Social links" })).toBeNull();
  });
});
