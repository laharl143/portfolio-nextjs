import { describe, expect, it } from "vitest";
import { sendAlertPayload } from "./alerts";
import { authorizeCleanup } from "./cleanup";
import { createAlertBody } from "./alert-email";
describe("AC-8: provider outcomes", () => {
  const payload = {
    sender: "fake@example.invalid",
    recipient: "owner@example.invalid",
    subject: "New portfolio inquiry",
    body: "Private inbox link",
    provider_key: "fake-key",
  };
  it("sends frozen HTML and text with the same idempotency key on retry", async () => {
    const frozen = {
      ...payload,
      body: createAlertBody("https://example.test/studio/inquiries/fake-id"),
    };
    const requests: RequestInit[] = [];
    const fetcher = (async (_url, init) => {
      requests.push(init!);
      return Response.json({ id: "fake-id" });
    }) as typeof fetch;
    await sendAlertPayload(frozen, "fake", fetcher);
    await sendAlertPayload(frozen, "fake", fetcher);
    expect(requests[0].body).toBe(requests[1].body);
    const sent = JSON.parse(requests[0].body as string);
    expect(sent.html).toContain("View inquiry");
    expect(sent.text).toContain("https://example.test/studio/inquiries/fake-id");
    expect(requests[0].headers).toMatchObject({ "Idempotency-Key": "fake-key" });
  });
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
