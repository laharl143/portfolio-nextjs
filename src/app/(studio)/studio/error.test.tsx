// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
vi.mock("./_components/reload-page", () => ({ reloadPage: vi.fn() }));
import StudioError from "./error";
import { reloadPage } from "./_components/reload-page";

const SECRET = "relation \"studio.sessions\" does not exist SECRET-0012";

describe("studio outage screen (spec 0012, AC-10)", () => {
  afterEach(cleanup);

  it("shows fixed text and never the error message or digest", () => {
    const error = Object.assign(new Error(SECRET), { digest: "digest-SECRET-0012" });
    const { container } = render(<StudioError error={error} reset={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Studio is unavailable" })).toBeInTheDocument();
    expect(
      screen.getByText("The studio could not reach its database. Nothing was changed. Try again in a moment."),
    ).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("SECRET-0012");
    expect(container.innerHTML).not.toMatch(/not reachable|not migrated/i);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("reloads the whole document on Try again, not reset()", () => {
    const reset = vi.fn();
    render(<StudioError error={new Error(SECRET)} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });
});
