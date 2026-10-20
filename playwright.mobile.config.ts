import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "mobile.spec.ts",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3003",
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/migrate.mjs && npm run dev -- --port 3003",
    url: "http://127.0.0.1:3003/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_URL: "http://127.0.0.1:3003",
      AUTH_SECRET: "mobile-test-secret-only-for-isolated-tests",
      AUTH_DATABASE_PATH: `data/mobile-test-${Date.now()}.sqlite`,
    },
  },
});
