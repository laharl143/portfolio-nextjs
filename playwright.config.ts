import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: { baseURL: "http://localhost:3100" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 375, height: 812 },
        defaultBrowserType: "chromium",
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: { LEAD_INTAKE_ENABLED: "false", STUDIO_ENABLED: "true", STUDIO_ORIGIN:"http://localhost:3100", STUDIO_RP_ID:"localhost" },
    timeout: 120000,
  },
});
