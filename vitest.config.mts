import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    // Reuse a VM worker to avoid slow DOM worker startup on Windows.
    pool: "vmThreads",
    maxWorkers: 1,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.db.test.ts"],
    environment: "node",
    restoreMocks: true,
    testTimeout: 30000,
  },
});
