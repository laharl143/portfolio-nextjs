// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import Services from "./Services";

afterEach(cleanup);

describe("Services (spec 0018, AC-1)", () => {
  it("ends with the contact link after the three cards", () => {
    const { container } = render(<Services />);
    const link = screen.getByRole("link", { name: "Tell me about your project" });
    expect(link).toHaveAttribute("href", "/contact");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    const list = container.querySelector("ul")!;
    expect(list.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
