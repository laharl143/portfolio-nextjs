import { describe, expect, it } from "vitest";
import {
  parseSubmission,
  payloadHash,
  transitionAllowed,
  conversionHash,
} from "./rules";

const draft = {
  submissionKey: "01234567-1234-4234-8234-012345678901",
  name: " Example Visitor ",
  email: " TEST@EXAMPLE.COM ",
  description: "A fake project description for verification.",
  company: "",
  budget: "",
  acknowledged: true,
  noticeVersion: "lead-intake-v1",
  challengeToken: "fake-token",
};
describe("AC-2, AC-3: intake validation and replay", () => {
  it("normalizes only specified fields and excludes challenge from the payload hash", () => {
    const a = parseSubmission(draft);
    expect(a.email).toBe("test@example.com");
    expect(a.name).toBe("Example Visitor");
    expect(a.company).toBeNull();
    expect(payloadHash(a)).toBe(
      payloadHash(parseSubmission({ ...draft, challengeToken: "other" })),
    );
    expect(payloadHash(a)).not.toBe(
      payloadHash(parseSubmission({ ...draft, budget: "100" })),
    );
  });
  it.each([
    { acknowledged: false },
    { description: "too short" },
    { name: "a\u0000b" },
    { name: "a\u0085b" },
    { email: "invalid" },
    { budget: "a".repeat(201) },
    { noticeVersion: "other" },
    { submissionKey: "bad" },
  ])("rejects invalid input %j", (change) => {
    expect(() => parseSubmission({ ...draft, ...change })).toThrow();
  });
  it("matches UTF16 limits and accepts normal multiline descriptions", () => {
    expect(() =>
      parseSubmission({ ...draft, name: "😀".repeat(101) }),
    ).toThrow();
    expect(
      parseSubmission({
        ...draft,
        description: "A description with\nnew lines and\ttabs.",
      }).description,
    ).toContain("\n");
  });
});
describe("AC-6, AC-7: owner state and conversion retry identity", () => {
  it("keeps converted final and requires reopening a closed inquiry", () => {
    expect(transitionAllowed("converted", "reviewing")).toBe(false);
    expect(transitionAllowed("closed", "converted")).toBe(false);
    expect(transitionAllowed("closed", "reviewing")).toBe(true);
    expect(transitionAllowed("new", "converted")).toBe(true);
  });
  it("hashes normalized fixed conversion inputs", () => {
    expect(
      conversionHash("new", " Example ", " Name ", "TEST@EXAMPLE.COM"),
    ).toBe(conversionHash("new", "Example", "Name", "test@example.com"));
  });
});
