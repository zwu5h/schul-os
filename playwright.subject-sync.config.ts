import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "subject-sync.spec.ts",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3005",
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/migrate.mjs && npm run dev -- --port 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_URL: "http://127.0.0.1:3005",
      AUTH_SECRET: "subject-sync-test-secret-only-for-isolated-tests",
      AUTH_DATABASE_PATH: `data/subject-sync-test-${Date.now()}.sqlite`,
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
