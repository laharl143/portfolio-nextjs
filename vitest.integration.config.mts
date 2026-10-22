import { defineConfig } from "vitest/config";
import base from "./vitest.config.mjs";
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    pool: "threads",
    include: ["src/**/*.db.test.ts"],
    exclude: [],
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});
