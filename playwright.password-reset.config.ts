import { defineConfig, devices } from "@playwright/test";

const databasePath = process.env.AUTH_DATABASE_PATH?.includes("password-reset-test-")
  ? process.env.AUTH_DATABASE_PATH
  : `data/password-reset-test-${Date.now()}.sqlite`;
process.env.AUTH_DATABASE_PATH = databasePath;

export default defineConfig({
  testDir: "./tests",
  testMatch: "password-reset.spec.ts",
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3002",
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: {
    command: "node scripts/migrate.mjs && npm run dev -- --port 3002",
    url: "http://127.0.0.1:3002/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_URL: "http://127.0.0.1:3002",
      AUTH_SECRET: "password-reset-test-secret-only-for-isolated-tests",
      AUTH_DATABASE_PATH: databasePath,
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "2526",
      SMTP_SECURE: "false",
      SMTP_REQUIRE_TLS: "false",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      SMTP_FROM: "School OS <school@example.test>",
    },
  },
});
