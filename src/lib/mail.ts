import "server-only";
import nodemailer from "nodemailer";

export function isPasswordResetEnabled(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendPasswordResetEmail(to: string, url: string) {
  if (!isPasswordResetEnabled()) {
    throw new Error("SMTP_HOST und SMTP_FROM müssen für Rücksetz-Mails gesetzt sein.");
  }
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure && process.env.SMTP_REQUIRE_TLS !== "false",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "School OS · Passwort zurücksetzen",
    text: `Du hast einen Link zum Zurücksetzen deines School-OS-Passworts angefordert.\n\nÖffne diesen Link, um ein neues Passwort festzulegen:\n${url}\n\nDer Link ist 30 Minuten gültig und kann nur einmal verwendet werden.\nWenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt dann unverändert.`,
  });
}
