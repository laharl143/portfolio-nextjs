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
describe("AC-3, AC-11: challenge reply matrix", () => {
  const TEST_SECRET = "1x0000000000000000000000000000000AA";
  const local = { ...config, turnstileSecret: TEST_SECRET, production: false };
  const prod = {
    ...config,
    origin: "https://example.test",
    turnstileSecret: "real",
    production: true,
  } as IntakeConfig;
  const testingReply = {
    success: true,
    hostname: "example.com",
    metadata: { result_with_testing_key: true },
  };
  const reply =
    (body: unknown, status = 200) =>
    (async () => Response.json(body, { status })) as typeof fetch;
  const strict = (c: IntakeConfig) => ({
    success: true,
    action: "lead_intake",
    hostname: new URL(c.origin).hostname,
  });
  it("accepts the testing reply outside production with the test secret", async () => {
    await expect(
      verifyChallenge("t", local, reply(testingReply)),
    ).resolves.toBeUndefined();
  });
  it("rejects the testing reply in production, even with matching fields", async () => {
    await expect(
      verifyChallenge("t", prod, reply(testingReply)),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      verifyChallenge(
        "t",
        prod,
        reply({ ...strict(prod), metadata: { result_with_testing_key: true } }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("sends a non test secret outside production through the strict check", async () => {
    const other = { ...local, turnstileSecret: "other" };
    await expect(
      verifyChallenge("t", other, reply(testingReply)),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      verifyChallenge("t", other, reply(strict(other))),
    ).resolves.toBeUndefined();
  });
  it("accepts a strict reply in production", async () => {
    await expect(
      verifyChallenge("t", prod, reply(strict(prod))),
    ).resolves.toBeUndefined();
  });
  describe.each([
    ["outside production", local],
    ["in production", prod],
  ])("%s", (_, c) => {
    it.each([
      ["wrong action", { ...strict(c), action: "wrong" }],
      ["wrong hostname", { ...strict(c), hostname: "attacker.invalid" }],
      ["success false", { ...strict(c), success: false }],
      ["testing reply without success", { ...testingReply, success: false }],
      ["testing flag not true", { ...testingReply, metadata: {} }],
    ])("rejects %s", async (_, body) => {
      await expect(verifyChallenge("t", c, reply(body))).rejects.toMatchObject({
        status: 403,
      });
    });
    it("rejects a non 200 reply", async () => {
      await expect(
        verifyChallenge("t", c, reply(testingReply, 500)),
      ).rejects.toMatchObject({ status: 403 });
    });
    it("rejects malformed JSON", async () => {
      await expect(
        verifyChallenge(
          "t",
          c,
          (async () => new Response("{")) as typeof fetch,
        ),
      ).rejects.toMatchObject({ status: 403 });
    });
    it("rejects a timeout", async () => {
      await expect(
        verifyChallenge("t", c, (async () => {
          throw new DOMException("timeout", "TimeoutError");
        }) as typeof fetch),
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});
