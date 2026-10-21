// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "./ContactForm";
import "@testing-library/jest-dom/vitest";
vi.mock("next/script", () => ({
  default: ({ onReady }: { onReady: () => void }) => {
    queueMicrotask(onReady);
    return null;
  },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.turnstile;
});
describe("AC-2, AC-4: visitor form states", () => {
  it("offers email while intake is unavailable", () => {
    render(<ContactForm enabled={false} siteKey="" />);
    expect(
      screen.getByRole("link", { name: "Send me an email" }),
    ).toHaveAttribute("href", "mailto:erskine.duenas@gmail.com");
  });
  it("preserves failed draft and submission identity, then confirms without exposing server details", async () => {
    const bodies: Record<string, unknown>[] = [];
    let count = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        bodies.push(JSON.parse(options.body));
        return count++ === 0
          ? Response.json({ code: "UNAVAILABLE" }, { status: 503 })
          : Response.json({ ok: true });
      }),
    );
    window.turnstile = {
      render: (_el, options) => {
        queueMicrotask(() => {
          (options.callback as (token: string) => void)("fake-challenge");
        });
        return "fake-widget";
      },
      reset: () => {},
      remove: () => {},
    };
    render(<ContactForm enabled siteKey="fake-public-key" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Name"), "Fake Visitor");
    await user.type(screen.getByLabelText("Email"), "fake@example.invalid");
    await user.type(
      screen.getByLabelText("Project description"),
      "This is a fake project with enough detail.",
    );
    await user.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Send inquiry" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Send inquiry" }));
    await screen.findByText(/Your inquiry could not be confirmed/);
    expect(screen.getByLabelText("Name")).toHaveValue("Fake Visitor");
    // Retry still submits the same immutable draft even when the new challenge is absent.
    fireEvent.submit(screen.getByLabelText("Name").closest("form")!);
    await screen.findByText("Thanks, your inquiry has been received.");
    expect(bodies[0].submissionKey).toBe(bodies[1].submissionKey);
    expect(bodies[0].name).toBe(bodies[1].name);
  });
});
