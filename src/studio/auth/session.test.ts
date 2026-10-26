import { beforeEach, describe, expect, it, vi } from "vitest";
// covers: scope feature 30 (session lookup log hygiene), spec 0012 AC-10 (outage screen and sign in redirect).
import { inspect } from "node:util";
import { getStudioSession, hashSessionToken } from "./session";

const state = vi.hoisted(() => ({ token: undefined as string | undefined, rows: [] as unknown[], failure: undefined as unknown }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.token === undefined ? undefined : { value: state.token }) }),
}));
vi.mock("@/studio/db/client", () => {
  const query = {
    from: () => query,
    where: () => query,
    limit: () => query,
    then: (resolve: (rows: unknown[]) => void, reject: (error: unknown) => void) =>
      state.failure === undefined ? resolve(state.rows) : reject(state.failure),
  };
  return { getDb: () => ({ select: () => query }) };
});

const token = "FAKE-session-token";
const tokenHash = hashSessionToken(token);

beforeEach(() => {
  state.token = token;
  state.rows = [];
  state.failure = Object.assign(new Error(`Failed query: select "id" from "studio_sessions"\nparams: ${tokenHash}`), {
    query: 'select "id" from "studio_sessions" where "token_hash" = $1',
    params: [tokenHash],
    cause: Object.assign(new Error("FAKE private driver detail"), { code: "57P01" }),
  });
});

describe("getStudioSession lookup failures", () => {
  it("throws only a safe name and code, never the query, parameters, or token hash", async () => {
    const failure = await getStudioSession().catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: "SessionLookupFailed", message: "session lookup failed (57P01)", code: "57P01" });
    expect(failure).not.toBe(state.failure);
    for (const text of [tokenHash, token, "studio_sessions", "token_hash", "private driver detail"]) {
      expect(inspect(failure, { depth: 10 })).not.toContain(text);
    }
    expect(failure).not.toHaveProperty("cause");
    expect(failure).not.toHaveProperty("query");
    expect(failure).not.toHaveProperty("params");
  });

  it("replaces arbitrary error text and codes with UNEXPECTED", async () => {
    state.failure = Object.assign(new Error(`FAKE ${tokenHash}`), { code: "FAKE private code" });
    await expect(getStudioSession()).rejects.toMatchObject({ message: "session lookup failed (UNEXPECTED)", code: "UNEXPECTED" });
  });
});

describe("getStudioSession without a failure", () => {
  beforeEach(() => {
    state.failure = undefined;
  });

  it("returns null with no cookie, so the guard redirects to sign in", async () => {
    state.token = undefined;
    await expect(getStudioSession()).resolves.toBeNull();
  });

  it("returns null when no live session matches", async () => {
    await expect(getStudioSession()).resolves.toBeNull();
  });

  it("returns the session for a matching row", async () => {
    state.rows = [{ sessionId: "s1", ownerId: "o1", workspaceId: "w1", lastSeenAt: new Date() }];
    await expect(getStudioSession()).resolves.toEqual({ sessionId: "s1", ownerId: "o1", workspaceId: "w1" });
  });
});
