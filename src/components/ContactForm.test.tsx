// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "./ContactForm";
import { contactData } from "../../utils/data/contact-data";
import "@testing-library/jest-dom/vitest";
const track = vi.fn();
vi.mock("@vercel/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
}));
vi.mock("next/script", () => ({
  default: ({ onReady }: { onReady: () => void }) => {
    queueMicrotask(onReady);
    return null;
  },
}));
afterEach(() => {
  cleanup();
  track.mockReset();
  sessionStorage.clear();
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
    expect(screen.queryByText("What happens next")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Fake Visitor");
    // Retry still submits the same immutable draft even when the new challenge is absent.
    fireEvent.submit(screen.getByLabelText("Name").closest("form")!);
    await screen.findByText("Thanks, your inquiry has been received.");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("What happens next");
    expect(
      screen.getByRole("heading", { level: 2, name: "What happens next" }),
    ).toBeInTheDocument();
    expect(
      within(status)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "I read your note and reply by email within 1 business day.",
      "My reply has a few questions about your project and a couple of times we could talk.",
      `Keep an eye on your inbox, and check your spam folder for a message from ${contactData.email}.`,
    ]);
    expect(status).not.toHaveTextContent(/booking|calendar|24 hours/i);
    expect(bodies[0].submissionKey).toBe(bodies[1].submissionKey);
    expect(bodies[0].name).toBe(bodies[1].name);
    await user.click(
      screen.getByRole("button", { name: "Start another inquiry" }),
    );
    expect(screen.queryByText("What happens next")).not.toBeInTheDocument();
  });
});

const funnel = () =>
  track.mock.calls.filter(([name]) => String(name).startsWith("inquiry_"));
function passChallenge() {
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
}
async function fillAndSend(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Fake Visitor");
  await user.type(screen.getByLabelText("Email"), "fake@example.invalid");
  await user.type(
    screen.getByLabelText("Project description"),
    "This is a fake project with enough detail.",
  );
  await user.click(screen.getByRole("checkbox"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send inquiry" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Send inquiry" }));
}
function remember(location: string, at = Date.now()) {
  sessionStorage.setItem(
    "ed:contact-location",
    JSON.stringify({ location, at }),
  );
}
describe("spec 0020: inquiry funnel events", () => {
  it("fires inquiry_start once on the first edit, never on focus or the challenge field", async () => {
    passChallenge();
    remember("hero");
    render(<ContactForm enabled siteKey="fake-public-key" />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Name"));
    await user.tab();
    expect(funnel()).toEqual([]);
    const hidden = document.createElement("input");
    hidden.name = "cf-turnstile-response";
    screen.getByLabelText("Name").closest("form")!.append(hidden);
    fireEvent.input(hidden, { target: { value: "x" } });
    expect(funnel()).toEqual([]);
    await user.type(screen.getByLabelText("Company (optional)"), "Fake");
    await user.type(screen.getByLabelText("Name"), "Fake");
    expect(funnel()).toEqual([["inquiry_start", { location: "hero" }]]);
  });

  it("sends the location, fires inquiry_sent, forgets the location, and restarts after another inquiry", async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        bodies.push(JSON.parse(options.body));
        return Response.json({ ok: true }, { status: 201 });
      }),
    );
    passChallenge();
    remember("services");
    render(<ContactForm enabled siteKey="fake-public-key" />);
    const user = userEvent.setup();
    await fillAndSend(user);
    await screen.findByText("Thanks, your inquiry has been received.");
    expect(bodies[0].sourceLocation).toBe("services");
    expect(funnel()).toEqual([
      ["inquiry_start", { location: "services" }],
      ["inquiry_sent", { location: "services" }],
    ]);
    expect(sessionStorage.getItem("ed:contact-location")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Start another inquiry" }),
    );
    await fillAndSend(user);
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).not.toHaveProperty("sourceLocation");
    expect(funnel().slice(2)).toEqual([
      ["inquiry_start", { location: "direct" }],
      ["inquiry_sent", { location: "direct" }],
    ]);
  });

  it("counts a 2xx with an unreadable body as sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json", { status: 201 })),
    );
    passChallenge();
    render(<ContactForm enabled siteKey="fake-public-key" />);
    await fillAndSend(userEvent.setup());
    await screen.findByText("Thanks, your inquiry has been received.");
    expect(funnel()).toEqual([
      ["inquiry_start", { location: "direct" }],
      ["inquiry_sent", { location: "direct" }],
    ]);
  });

  it.each([
    [422, "validation"],
    [403, "challenge"],
    [429, "rate_limited"],
    [500, "server"],
    [409, "server"],
    [503, "server"],
  ])("maps a %i to inquiry_failed %s, once per attempt", async (status, reason) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: false }, { status })),
    );
    passChallenge();
    remember("footer");
    render(<ContactForm enabled siteKey="fake-public-key" />);
    await fillAndSend(userEvent.setup());
    await screen.findByRole("button", { name: "Retry this draft" });
    fireEvent.submit(screen.getByLabelText("Name").closest("form")!);
    await waitFor(() =>
      expect(funnel()).toEqual([
        ["inquiry_start", { location: "footer" }],
        ["inquiry_failed", { location: "footer", reason }],
        ["inquiry_failed", { location: "footer", reason }],
      ]),
    );
    expect(sessionStorage.getItem("ed:contact-location")).not.toBeNull();
  });

  it("maps a thrown request to network, keeps the start after Edit draft, and carries only fixed codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    passChallenge();
    render(<ContactForm enabled siteKey="fake-public-key" />);
    const user = userEvent.setup();
    await fillAndSend(user);
    await screen.findByText(/Retry this draft to avoid a duplicate/);
    await user.click(
      screen.getByRole("button", { name: "Edit draft (new submission)" }),
    );
    await user.type(screen.getByLabelText("Name"), " Again");
    expect(funnel()).toEqual([
      ["inquiry_start", { location: "direct" }],
      ["inquiry_failed", { location: "direct", reason: "network" }],
    ]);
    for (const [, props] of funnel())
      expect(Object.keys(props).every((k) => ["location", "reason"].includes(k))).toBe(true);
  });
});
