import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { after } from "next/server";
import { isPasswordResetEnabled, sendPasswordResetEmail } from "./mail";
import { backendOrigin } from "./server-backend";
import { z } from "zod";

function createLocalAuth() {
  const databasePath = resolve(/* turbopackIgnore: true */ process.env.AUTH_DATABASE_PATH || "data/auth.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  return betterAuth({
  appName: "School OS",
  baseURL: process.env.APP_URL || "http://localhost:3000",
  secret: process.env.AUTH_SECRET,
  database,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: isPasswordResetEnabled()
      ? async ({ user, url }) => {
          after(async () => {
            try {
              await sendPasswordResetEmail(user.email, url);
            } catch {
              // Do not log recipients, reset tokens, or SMTP credentials.
              console.error("School OS: Rücksetz-Mail konnte nicht gesendet werden. SMTP-Konfiguration und Erreichbarkeit prüfen.");
            }
          });
        }
      : undefined,
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
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 3 },
    },
  },
});
}

let localAuth: ReturnType<typeof createLocalAuth> | undefined;
export function getLocalAuth() {
  if (backendOrigin()) throw new Error("Lokale Anmeldung ist im Backend-Modus deaktiviert.");
  return localAuth ??= createLocalAuth();
}

const remoteSession = z.object({ user: z.object({ id: z.string().min(1) }) }).nullable();

export const auth = {
  api: {
    async getSession({ headers }: { headers: Headers }) {
      const origin = backendOrigin();
      if (!origin) return getLocalAuth().api.getSession({ headers });
      const cookie = headers.get("cookie");
      if (!cookie) return null;
      const response = await fetch(`${origin}/api/auth/get-session`, {
        headers: { cookie }, cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Der Kontoserver ist vorübergehend nicht erreichbar.");
      return remoteSession.parse(await response.json());
    },
  },
};
