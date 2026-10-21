import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mock = vi.hoisted(() => ({
  rows: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  validate: vi.fn(),
}));
vi.mock("./db", () => ({
  rows: mock.rows,
  validateWorkspace: mock.validate,
  getDb: () => ({ execute: mock.execute, transaction: mock.transaction }),
}));
import { cleanupInquiries } from "./cleanup";
beforeEach(() => {
  vi.clearAllMocks();
  mock.transaction.mockImplementation(async (fn) =>
    fn({ execute: mock.execute }),
  );
});
it("AC-9: records committed progress when another cleanup acquires the lock between batches", async () => {
  mock.rows
    .mockResolvedValueOnce([{ locked: true }])
    .mockResolvedValueOnce([{ id: "fake" }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ exists: 1 }])
    .mockResolvedValueOnce([{ locked: false }]);
  const result = await cleanupInquiries("00000000-0000-4000-8000-000000000001");
  expect(result).toMatchObject({ deleted: 1, outcome: "incomplete" });
  const query = new PgDialect().sqlToQuery(mock.execute.mock.calls[0][0]);
  expect(query.params).toContain(1);
  expect(query.params).toContain("incomplete");
});
