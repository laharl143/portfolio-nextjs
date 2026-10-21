import { describe, expect, it, vi } from "vitest";
vi.mock("@/studio/guard", () => ({
  requireStudioAccess: vi.fn(async () => {
    throw new Error("SIGNED_OUT");
  }),
}));
vi.mock("@/studio/data/inquiries", () => ({
  changeInquiryStatus: vi.fn(),
  convertInquiry: vi.fn(),
  validId: vi.fn(),
  validVersion: vi.fn(),
}));
vi.mock("@/inquiries/alerts", () => ({ attemptAlert: vi.fn() }));
const jar = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => jar) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
import {
  changeInquiryStatusAction,
  convertInquiryAction,
  retryInquiryAlertAction,
  searchInquiriesAction,
} from "./actions";
import { requireStudioAccess } from "@/studio/guard";
import { changeInquiryStatus, convertInquiry } from "@/studio/data/inquiries";
import { attemptAlert } from "@/inquiries/alerts";
describe("AC-10: every action guards before reading input or mutating", () => {
  it.each([
    changeInquiryStatusAction,
    convertInquiryAction,
    retryInquiryAlertAction,
  ])("denies a signed out POST", async (action) => {
    await expect(action({ ok: true }, new FormData())).rejects.toThrow(
      "SIGNED_OUT",
    );
    expect(changeInquiryStatus).not.toHaveBeenCalled();
    expect(convertInquiry).not.toHaveBeenCalled();
    expect(attemptAlert).not.toHaveBeenCalled();
  });
});
describe("AC-10: inbox search keeps visitor data out of the URL", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    return data;
  };
  it("denies a signed out POST before storing the term", async () => {
    jar.set.mockClear();
    await expect(
      searchInquiriesAction(form({ q: "FAKE_PRIVATE_SENTINEL" })),
    ).rejects.toThrow("SIGNED_OUT");
    expect(jar.set).not.toHaveBeenCalled();
  });
  it("stores the term in a cookie and redirects with status and alert only", async () => {
    jar.set.mockClear();
    vi.mocked(requireStudioAccess).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof requireStudioAccess>>,
    );
    const error = await searchInquiriesAction(
      form({
        q: "  fake-sentinel@example.invalid ",
        status: "new",
        alert: "attention",
      }),
    ).catch((e: Error) => e);
    expect(String(error)).toBe(
      "Error: REDIRECT /studio/inquiries?status=new&alert=attention",
    );
    expect(String(error)).not.toContain("sentinel");
    expect(jar.set).toHaveBeenCalledWith(
      "studio_inquiry_q",
      "fake-sentinel@example.invalid",
      expect.objectContaining({
        httpOnly: true,
        path: "/studio/inquiries",
        sameSite: "strict",
      }),
    );
  });
  it("clears the cookie when the search is empty", async () => {
    jar.set.mockClear();
    vi.mocked(requireStudioAccess).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof requireStudioAccess>>,
    );
    const error = await searchInquiriesAction(form({ q: " " })).catch(
      (e: Error) => e,
    );
    expect(String(error)).toBe("Error: REDIRECT /studio/inquiries");
    expect(jar.set).toHaveBeenCalledWith(
      "studio_inquiry_q",
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
  });
  it("caps the stored term at 100 characters", async () => {
    jar.set.mockClear();
    vi.mocked(requireStudioAccess).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof requireStudioAccess>>,
    );
    await searchInquiriesAction(form({ q: "é".repeat(150) })).catch(() => {});
    expect(jar.set.mock.calls[0][1]).toBe("é".repeat(100));
  });
  it("keeps only a set status or alert in the redirect, never page or other fields", async () => {
    vi.mocked(requireStudioAccess).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof requireStudioAccess>>,
    );
    const error = await searchInquiriesAction(
      form({
        q: "Fake Visitor",
        status: "",
        alert: "accepted",
        page: "3",
        email: "fake@example.invalid",
      }),
    ).catch((e: Error) => e);
    expect(String(error)).toBe("Error: REDIRECT /studio/inquiries?alert=accepted");
  });
});
