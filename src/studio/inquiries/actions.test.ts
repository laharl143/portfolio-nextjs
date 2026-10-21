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
import {
  changeInquiryStatusAction,
  convertInquiryAction,
  retryInquiryAlertAction,
} from "./actions";
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
