// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
vi.mock("@/studio/guard", () => ({ requireStudioAccess: vi.fn(async () => ({})) }));
vi.mock("@/studio/data/inquiries", () => ({ listInquiries: vi.fn() }));
vi.mock("@/studio/inquiries/actions", () => ({ searchInquiriesAction: vi.fn() }));
const jar = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => jar) }));
import InquiriesPage from "./page";
import { requireStudioAccess } from "@/studio/guard";
import { listInquiries } from "@/studio/data/inquiries";
type Listing = Awaited<ReturnType<typeof listInquiries>>;
const listing = (over: Partial<Listing> = {}) =>
  ({
    q: "",
    status: "",
    alert: "",
    page: 2,
    total: 120,
    health: null,
    items: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Fake Visitor",
        email: "fake-visitor@example.invalid",
        company: null,
        status: "new",
        alert_state: "accepted",
        created_at: "2026-10-21T00:00:00Z",
      },
    ],
    ...over,
  }) as unknown as Listing;
const show = async (params: Record<string, string>) =>
  render(await InquiriesPage({ searchParams: Promise.resolve(params) }));
afterEach(() => {
  cleanup();
  jar.get.mockReset();
});
describe("AC-5, AC-10: inbox search stays out of the URL", () => {
  it("guards before listing anything", async () => {
    vi.mocked(requireStudioAccess).mockRejectedValueOnce(new Error("SIGNED_OUT"));
    await expect(
      InquiriesPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("SIGNED_OUT");
    expect(listInquiries).not.toHaveBeenCalled();
  });
  it("ignores an old ?q= bookmark and searches by the cookie only", async () => {
    jar.get.mockReturnValue(undefined);
    vi.mocked(listInquiries).mockResolvedValueOnce(listing());
    await show({ q: "fake-bookmark@example.invalid", status: "new", page: "2" });
    expect(listInquiries).toHaveBeenCalledWith({
      q: undefined,
      status: "new",
      alert: undefined,
      page: "2",
    });
    expect(screen.getByLabelText("Search name, email, company")).toHaveValue("");
  });
  it("reads the term from the search cookie and keeps it in the box", async () => {
    jar.get.mockReturnValue({ value: "Fake Visitor" });
    vi.mocked(listInquiries).mockResolvedValueOnce(listing({ q: "Fake Visitor" }));
    await show({});
    expect(jar.get).toHaveBeenCalledWith("studio_inquiry_q");
    expect(vi.mocked(listInquiries).mock.lastCall?.[0].q).toBe("Fake Visitor");
    expect(screen.getByLabelText("Search name, email, company")).toHaveValue(
      "Fake Visitor",
    );
  });
  it("builds paging links with status, alert, and page but never the term", async () => {
    jar.get.mockReturnValue({ value: "Fake Visitor" });
    vi.mocked(listInquiries).mockResolvedValueOnce(
      listing({ q: "Fake Visitor", status: "new", alert: "attention" }),
    );
    await show({ status: "new", alert: "attention", page: "2" });
    for (const name of ["Previous", "Next"]) {
      const href = screen.getByRole("link", { name }).getAttribute("href")!;
      expect(href).not.toMatch(/[?&]q=|Fake/);
      expect(href).toContain("status=new&alert=attention");
    }
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/studio/inquiries?status=new&alert=attention&page=1",
    );
  });
  it("says no inquiries match when a cookie search finds nothing", async () => {
    jar.get.mockReturnValue({ value: "No Such Fake" });
    vi.mocked(listInquiries).mockResolvedValueOnce(
      listing({ q: "No Such Fake", page: 1, total: 0, items: [] }),
    );
    await show({});
    expect(screen.getByText(/No inquiries match these filters\./)).toBeVisible();
  });
});
