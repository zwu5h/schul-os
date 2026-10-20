import { test, expect } from "@playwright/test";
import { createServer, type Socket } from "node:net";
import Database from "better-sqlite3";

// A local SMTP receiver exercises the actual mail transport without delivering mail.
test("password reset sends mail, expires tokens, changes credentials and revokes sessions", async ({ page, request }) => {
  test.skip(!process.env.AUTH_DATABASE_PATH?.includes("password-reset-test-"), "Use playwright.password-reset.config.ts with an isolated database and SMTP receiver.");
  const mails: string[] = [];
  const sockets = new Set<Socket>();
  const smtp = createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost test SMTP\r\n");
    let buffer = "";
    let inData = false;
    let message = "";
    socket.on("data", chunk => {
      buffer += chunk.toString();
      let end: number;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (inData) {
          if (line === ".") {
            mails.push(message);
            message = "";
            inData = false;
            socket.write("250 accepted\r\n");
          } else message += `${line}\r\n`;
        } else if (/^EHLO|^HELO/i.test(line)) socket.write("250 localhost\r\n");
        else if (/^DATA/i.test(line)) {
          inData = true;
          socket.write("354 send message\r\n");
        } else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise<void>(resolve => smtp.listen(2526, "127.0.0.1", resolve));
  const db = new Database(process.env.AUTH_DATABASE_PATH!);
  const email = "reset@example.test";
  const oldPassword = "old-password-12345";
  const newPassword = "new-password-67890";
  const origin = "http://127.0.0.1:3002";
  const post = (path: string, data: Record<string, string>) => request.post(`/api/auth/${path}`, { data, headers: { origin } });
  function mailLink(index: number) {
    const decoded = mails[index].replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    return decoded.match(/http:\/\/127\.0\.0\.1:3002\/api\/auth\/reset-password\/[^\s]+/)![0];
  }

  try {
    const signup = await post("sign-up/email", { email, password: oldPassword, name: "Reset Test" });
    expect(signup.ok()).toBeTruthy();
    expect((await request.get("/api/auth/get-session")).ok()).toBeTruthy();
    const unknown = await post("request-password-reset", { email: "missing@example.test", redirectTo: `${origin}/reset-password` });
    expect(unknown.ok()).toBeTruthy();
    const unknownBody = await unknown.json();

    await page.goto("/login");
    await page.getByRole("link", { name: "Passwort vergessen?" }).click();
    await page.waitForLoadState("networkidle");
    await page.getByLabel("E-Mail").fill(email);
    const [submitted] = await Promise.all([
      page.waitForResponse(response => response.url().endsWith("/request-password-reset")),
      page.getByRole("button", { name: "Rücksetz-Link senden" }).click(),
    ]);
    expect(submitted.status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("Falls ein Konto");
    await expect.poll(() => mails.length).toBe(1);
    expect(mails[0]).toContain("To: reset@example.test");
    const firstLink = mailLink(0);
    const firstToken = new URL(firstLink).pathname.split("/").at(-1)!;
    db.prepare('UPDATE verification SET expiresAt = ? WHERE identifier = ?').run(Date.now() - 60_000, `reset-password:${firstToken}`);
    await page.goto(firstLink);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("ungültig oder abgelaufen");
    const expired = await post("reset-password", { token: firstToken, newPassword });
    expect(expired.status()).toBe(400);

    const known = await post("request-password-reset", { email, redirectTo: `${origin}/reset-password` });
    expect(await known.json()).toEqual(unknownBody);
    await expect.poll(() => mails.length).toBe(2);
    const resetLink = mailLink(1);
    const token = new URL(resetLink).pathname.split("/").at(-1)!;
    await page.goto(resetLink);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Neues Passwort", { exact: true }).fill(newPassword);
    await page.getByLabel("Passwort wiederholen").fill("does-not-match-123");
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("stimmen nicht überein");
    await page.getByLabel("Passwort wiederholen").fill(newPassword);
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByRole("status")).toContainText("Passwort wurde geändert");
    expect(page.url()).toBe(`${origin}/reset-password`);

    expect(await (await request.get("/api/auth/get-session")).json()).toBeNull();
    expect((await post("sign-in/email", { email, password: oldPassword })).status()).toBe(401);
    expect((await post("sign-in/email", { email, password: newPassword })).ok()).toBeTruthy();
    expect((await post("reset-password", { token, newPassword: oldPassword })).status()).toBe(400);
    expect((await post("request-password-reset", { email, redirectTo: `${origin}/reset-password` })).status()).toBe(429);
    await page.goto("/reset-password");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("ungültig oder abgelaufen");
  } finally {
    db.close();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => smtp.close(() => resolve()));
  }
});
