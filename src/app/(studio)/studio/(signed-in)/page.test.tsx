// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
vi.mock("@/studio/guard", () => ({ requireStudioAccess: vi.fn(async () => ({})) }));
vi.mock("@/studio/db/status", () => ({ getDatabaseStatus: vi.fn() }));
vi.mock("@/studio/storage/blob", () => ({ isStoreReachable: vi.fn() }));
vi.mock("@/studio/data/counts", () => ({ getRecordCounts: vi.fn() }));
vi.mock("@/studio/data/home", () => ({
  getInquirySignal: vi.fn(),
  getContractSignal: vi.fn(),
  getExportDriftSignal: vi.fn(),
  getStatusOverview: vi.fn(),
}));
vi.mock("@/studio/retention/service", () => ({ getRetentionAttention: vi.fn() }));
import StudioPage from "./page";
import { requireStudioAccess } from "@/studio/guard";
import { getDatabaseStatus } from "@/studio/db/status";
import { isStoreReachable } from "@/studio/storage/blob";
import { getRecordCounts } from "@/studio/data/counts";
import { getContractSignal, getExportDriftSignal, getInquirySignal, getStatusOverview } from "@/studio/data/home";
import { getRetentionAttention } from "@/studio/retention/service";

const NOW = new Date("2026-10-22T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3600000).toISOString();

const busy = () => {
  vi.mocked(getInquirySignal).mockResolvedValue({
    open: 2,
    alertProblems: 1,
    rows: [
      { id: "00000000-0000-4000-8000-0000000000a1", name: "Fake Visitor", company: "Fake Co", createdAt: hoursAgo(50), alertProblem: true },
      { id: "00000000-0000-4000-8000-0000000000a2", name: "Other Fake", company: null, createdAt: hoursAgo(5), alertProblem: false },
    ],
  });
  vi.mocked(getContractSignal).mockResolvedValue({
    sent: 1,
    draft: 1,
    rows: [
      { id: "00000000-0000-4000-8000-0000000000b1", title: "Fake retainer", clientName: "Fake Client", status: "sent", changedAt: hoursAgo(72) },
      { id: "00000000-0000-4000-8000-0000000000b2", title: "Fake build", clientName: "Fake Client", status: "draft", changedAt: hoursAgo(1) },
    ],
  });
  vi.mocked(getRetentionAttention).mockResolvedValue({
    eligible: 1,
    rows: [{ kind: "client", id: "00000000-0000-4000-8000-0000000000c1", name: "Fake Archived", dueAt: hoursAgo(24 * 12) }],
  });
  vi.mocked(getExportDriftSignal).mockResolvedValue({ differences: ["Fake: public summary changed"] });
};
const quiet = () => {
  vi.mocked(getInquirySignal).mockResolvedValue({ open: 0, alertProblems: 0, rows: [] });
  vi.mocked(getContractSignal).mockResolvedValue({ sent: 0, draft: 0, rows: [] });
  vi.mocked(getRetentionAttention).mockResolvedValue({ eligible: 0, rows: [] });
  vi.mocked(getExportDriftSignal).mockResolvedValue({ differences: [] });
};

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getDatabaseStatus).mockResolvedValue({ state: "migrated", count: 14 });
  vi.mocked(isStoreReachable).mockResolvedValue(true);
  vi.mocked(getRecordCounts).mockResolvedValue({
    clients: 4,
    contacts: 9,
    projects: 2,
    contracts: 3,
    notes: 7,
    systems: 5,
    systemLinks: 6,
  });
  vi.mocked(getStatusOverview).mockResolvedValue({
    clients: { lead: 2, active: 1, past: 0 },
    contracts: { draft: 1, sent: 1, signed: 0, active: 1, ended: 0, cancelled: 0 },
    projects: { planned: 0, active: 0, on_hold: 0, done: 0, cancelled: 0 },
  });
  busy();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const show = async () => render(await StudioPage());
const strip = () => screen.getByRole("list", { name: "What needs you" });
const tiles = () => within(strip()).getAllByRole("listitem");

describe("AC-1: guard first", () => {
  it("reads nothing when the guard rejects", async () => {
    vi.mocked(requireStudioAccess).mockRejectedValueOnce(new Error("SIGNED_OUT"));
    await expect(StudioPage()).rejects.toThrow("SIGNED_OUT");
    expect(getDatabaseStatus).not.toHaveBeenCalled();
    expect(getInquirySignal).not.toHaveBeenCalled();
  });
});

describe("AC-2 to AC-6: the strip and the attention lists", () => {
  it("shows four tiles in a fixed order with their counts", async () => {
    await show();
    const texts = tiles().map((tile) => tile.textContent);
    expect(texts[0]).toMatch(/^Inquiries2.*2 open · 1 alert failed$/);
    expect(texts[1]).toMatch(/^Contracts2.*1 sent · 1 draft$/);
    expect(texts[2]).toMatch(/^Retention1/);
    expect(texts[3]).toMatch(/^Public export1Out of date$/);
    expect(within(tiles()[0]).getByRole("link")).toHaveAttribute("href", "#inquiries");
  });

  it("lists inquiries with company, age, alert mark, and links", async () => {
    await show();
    const section = screen.getByRole("region", { name: "Inquiries" });
    const rows = within(section).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Fake Visitor");
    expect(rows[0]).toHaveTextContent("Fake Co");
    expect(rows[0]).toHaveTextContent("Alert failed");
    expect(rows[0]).toHaveTextContent("2d");
    expect(rows[1]).not.toHaveTextContent("Alert failed");
    expect(rows[1]).toHaveTextContent("5h");
    expect(within(rows[0]).getByRole("link")).toHaveAttribute("href", "/studio/inquiries/00000000-0000-4000-8000-0000000000a1");
    expect(within(section).getByRole("link", { name: "See all" })).toHaveAttribute("href", "/studio/inquiries");
    expect(within(section).getByRole("link", { name: "Check alerts" })).toHaveAttribute(
      "href",
      "/studio/inquiries?alert=attention",
    );
  });

  it("lists contracts, retention, and export differences with their links", async () => {
    await show();
    const contracts = screen.getByRole("region", { name: "Contracts" });
    expect(within(contracts).getAllByRole("listitem")[0]).toHaveTextContent("Fake retainer");
    expect(within(contracts).getAllByRole("listitem")[0]).toHaveTextContent("Sent");
    expect(within(contracts).getByRole("link", { name: "See all" })).toHaveAttribute("href", "/studio/contracts?status=sent");

    const retention = screen.getByRole("region", { name: "Retention reviews due" });
    expect(within(retention).getByRole("link", { name: /Fake Archived/ })).toHaveAttribute(
      "href",
      "/studio/retention/client/00000000-0000-4000-8000-0000000000c1",
    );
    expect(retention).toHaveTextContent("due 12d ago");
    expect(within(retention).getByRole("link", { name: "See all" })).toHaveAttribute("href", "/studio/retention?state=eligible");

    const drift = screen.getByRole("region", { name: "Public export: 1 difference" });
    expect(drift).toHaveTextContent("Fake: public summary changed");
    expect(within(drift).getByRole("link", { name: "Open systems" })).toHaveAttribute("href", "/studio/systems");
  });

  it("dims a zero tile, keeps its place, and omits its section", async () => {
    vi.mocked(getContractSignal).mockResolvedValue({ sent: 0, draft: 0, rows: [] });
    await show();
    expect(tiles()).toHaveLength(4);
    expect(tiles()[1]).toHaveAttribute("data-dimmed", "true");
    expect(tiles()[0]).not.toHaveAttribute("data-dimmed");
    expect(screen.queryByRole("region", { name: "Contracts" })).toBeNull();
  });

  it("links contract See all to drafts when nothing is sent", async () => {
    vi.mocked(getContractSignal).mockResolvedValue({
      sent: 0,
      draft: 1,
      rows: [{ id: "00000000-0000-4000-8000-0000000000b2", title: "Fake build", clientName: "Fake Client", status: "draft", changedAt: hoursAgo(1) }],
    });
    await show();
    const contracts = screen.getByRole("region", { name: "Contracts" });
    expect(within(contracts).getByRole("link", { name: "See all" })).toHaveAttribute("href", "/studio/contracts?status=draft");
  });
});

describe("AC-7: all clear", () => {
  it("replaces the strip and lists when every signal is 0", async () => {
    quiet();
    await show();
    expect(screen.getByRole("heading", { name: "All clear" })).toBeVisible();
    expect(screen.queryByRole("list", { name: "What needs you" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  it("never shows while a signal failed, even if the rest are 0", async () => {
    quiet();
    vi.mocked(getContractSignal).mockRejectedValue(new Error("boom"));
    await show();
    expect(screen.queryByRole("heading", { name: "All clear" })).toBeNull();
    expect(strip()).toBeVisible();
  });
});

describe("AC-8: overview bars", () => {
  it("shows a legend per status with links for clients and contracts only", async () => {
    await show();
    const overview = screen.getByRole("region", { name: "Overview" });
    expect(within(overview).getByRole("link", { name: "Lead 2" })).toHaveAttribute("href", "/studio/clients?status=lead");
    expect(within(overview).getByRole("link", { name: "Past 0" })).toHaveAttribute("href", "/studio/clients?status=past");
    expect(within(overview).getAllByRole("link", { name: "Active 1" }).map((link) => link.getAttribute("href"))).toEqual([
      "/studio/clients?status=active",
      "/studio/contracts?status=active",
    ]);
    expect(within(overview).getByRole("link", { name: "Cancelled 0" })).toHaveAttribute("href", "/studio/contracts?status=cancelled");
    expect(within(overview).getByText("No projects yet")).toBeVisible();
    expect(within(overview).queryByRole("link", { name: /Planned|On hold|Done/ })).toBeNull();
  });
});

describe("AC-9: health footer", () => {
  it("shows the database and storage lines and the seven counts", async () => {
    await show();
    const footer = screen.getByRole("region", { name: "System health" });
    expect(footer).toHaveTextContent("Connected, 14 migrations applied");
    expect(footer).toHaveTextContent("Private store reachable");
    for (const text of ["Clients4", "Contacts9", "Projects2", "Contracts3", "Notes7", "Systems5", "System links6"]) {
      expect(footer.textContent).toContain(text);
    }
    expect(footer.querySelectorAll('[data-ok="true"]')).toHaveLength(2);
  });
});

describe("AC-10: database and storage failures", () => {
  it("shows only the red card and footer when the database is down", async () => {
    vi.mocked(getDatabaseStatus).mockResolvedValue({ state: "not-connected" });
    await show();
    expect(screen.getByRole("alert")).toHaveTextContent("Database not reachable");
    expect(screen.queryByRole("list", { name: "What needs you" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Overview" })).toBeNull();
    expect(screen.getByRole("region", { name: "System health" })).toHaveTextContent("Not connected");
    for (const read of [getInquirySignal, getContractSignal, getRetentionAttention, getExportDriftSignal, getStatusOverview, getRecordCounts]) {
      expect(read).not.toHaveBeenCalled();
    }
  });

  it("says not migrated when the journal is missing", async () => {
    vi.mocked(getDatabaseStatus).mockResolvedValue({ state: "not-migrated" });
    await show();
    expect(screen.getByRole("alert")).toHaveTextContent("Database not migrated");
  });

  it("shows the storage card above a normal strip", async () => {
    vi.mocked(isStoreReachable).mockResolvedValue(false);
    await show();
    expect(screen.getByRole("alert")).toHaveTextContent("File storage not reachable");
    expect(tiles()).toHaveLength(4);
    expect(screen.getByRole("region", { name: "System health" })).toHaveTextContent("Storage not reachable");
  });
});

describe("AC-11: one failed signal", () => {
  it("marks only that tile and section, and logs the name and class only", async () => {
    class FakeQueryError extends Error {}
    vi.mocked(getContractSignal).mockRejectedValue(new FakeQueryError("Fake Client row data"));
    await show();
    expect(tiles()[1]).toHaveTextContent("!");
    expect(tiles()[1]).toHaveTextContent("Could not load");
    expect(within(screen.getByRole("region", { name: "Contracts" })).getByText("Could not load")).toBeVisible();
    expect(tiles()[0]).toHaveTextContent("2 open");
    expect(screen.getByRole("region", { name: "Overview" })).toBeVisible();
    expect(console.error).toHaveBeenCalledWith("[studio] home signal", "contracts", "FakeQueryError");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Fake Client");
  });

  it("hides the record counts when their read fails", async () => {
    vi.mocked(getRecordCounts).mockRejectedValue(new Error("boom"));
    await show();
    expect(screen.getByRole("region", { name: "System health" })).not.toHaveTextContent("System links");
  });
});
