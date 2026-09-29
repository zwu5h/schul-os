import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";

const databasePath = resolve(/* turbopackIgnore: true */ process.env.AUTH_DATABASE_PATH || "data/auth.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
database.pragma("journal_mode = WAL");

export const auth = betterAuth({
  appName: "School OS",
  baseURL: process.env.APP_URL || "http://localhost:3000",
  secret: process.env.AUTH_SECRET,
  database,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-real-ip"] },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 3 },
    },
  },
});
