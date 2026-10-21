import { describe, expect, it } from "vitest";
import { sendAlertPayload } from "./alerts";
import { authorizeCleanup } from "./cleanup";
describe("AC-8: provider outcomes", () => {
  const payload = {
    sender: "fake@example.invalid",
    recipient: "owner@example.invalid",
    subject: "New portfolio inquiry",
    body: "Private inbox link",
    provider_key: "fake-key",
  };
  it("distinguishes rejection from uncertainty and acceptance", async () => {
    expect(
      await sendAlertPayload(payload, "fake", (async () =>
        Response.json({ id: "fake-id" })) as typeof fetch),
    ).toMatchObject({ state: "accepted" });
    expect(
      await sendAlertPayload(payload, "fake", (async () =>
        Response.json({}, { status: 422 })) as typeof fetch),
    ).toMatchObject({ state: "failed" });
    expect(
      await sendAlertPayload(payload, "fake", (async () => {
        throw new Error("timeout");
      }) as typeof fetch),
    ).toMatchObject({ state: "unknown" });
    expect(
      await sendAlertPayload(payload, "fake", (async () =>
        Response.json({})) as typeof fetch),
    ).toMatchObject({ state: "unknown" });
  });
});
describe("AC-9, AC-11: cleanup authentication", () => {
  it("rejects local unauthenticated cleanup and empty secrets", () => {
    expect(() =>
      authorizeCleanup(
        new Request("http://localhost/api/internal/inquiries/cleanup"),
      ),
    ).toThrow();
  });
});
