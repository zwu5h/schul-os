import { defineConfig } from "@playwright/test";
import config from "./playwright.subject-sync.config";

export default defineConfig({
  ...config,
  testMatch: ["learn.spec.ts", "subject-sync.spec.ts"],
});
