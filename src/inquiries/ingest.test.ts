import { describe, expect, it } from "vitest";
import { readBody, verifyChallenge } from "./ingest";
import type { IntakeConfig } from "./config";
const config = {
  origin: "http://localhost:3000",
  turnstileSecret: "fake",
} as IntakeConfig;
describe("AC-3: ingestion edge rejection", () => {
  it("caps bytes while streaming and rejects content types and malformed JSON", async () => {
    await expect(
      readBody(
        new Request("http://localhost", {
          method: "POST",
          body: "a".repeat(65537),
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readBody(new Request("http://localhost", { method: "POST", body: "{}" })),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readBody(
        new Request("http://localhost", {
          method: "POST",
          body: "{",
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
  it.each([
    { success: false },
    { success: true, action: "wrong", hostname: "localhost" },
    { success: true, action: "lead_intake", hostname: "attacker.invalid" },
  ])("fails closed for challenge %j", async (body) => {
    await expect(
      verifyChallenge("fake", config, (async () =>
        Response.json(body)) as typeof fetch),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("rejects uncertain challenge requests", async () => {
    await expect(
      verifyChallenge("fake", config, (async () => {
        throw new Error("timeout");
      }) as typeof fetch),
    ).rejects.toMatchObject({ status: 403 });
  });
});
