import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**", "out/**", "build/**", "test-results/**", "playwright-report/**", "next-env.d.ts",
    // Installed tool skills and local generated artifacts are not application source.
    ".agents/skills/**", ".claude/skills/**", "graphify-out/**", ".vercel/**",
  ]),
]);
