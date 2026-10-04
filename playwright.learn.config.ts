import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "learn.spec.ts",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3006",
    ...devices["Desktop Chrome"],
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/migrate.mjs && npm run dev -- --port 3006",
    url: "http://127.0.0.1:3006/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_URL: "http://127.0.0.1:3006",
      AUTH_SECRET: "flashcard-test-secret-only-for-isolated-tests",
      AUTH_DATABASE_PATH: `data/learn-test-${Date.now()}.sqlite`,
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
