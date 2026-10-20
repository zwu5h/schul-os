import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { emptyWorkspace } from "../src/lib/demo";

function subject(name: string) {
  return { id: randomUUID(), name, color: "#9184d7", icon: "◎", teacher: "", room: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

async function signup(request: APIRequestContext) {
  const response = await request.post("/api/auth/sign-up/email", {
    data: { email: `sync-${randomUUID()}@example.test`, password: "subject-test-password-123", name: "Sync Test" },
  });
  expect(response.ok()).toBeTruthy();
}

async function open(page: Page) {
  await page.goto("/");
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
}

test("existing PC and phone subjects merge and new subjects sync in both directions", async ({ browser, playwright, baseURL }) => {
  const account = await playwright.request.newContext({ baseURL });
  await signup(account);
  const storageState = await account.storageState();
  const pc = await browser.newContext({ storageState, baseURL });
  const phone = await browser.newContext({ storageState, baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    for (const [context, name] of [[pc, "PC Physik"], [phone, "Handy Deutsch"]] as const) {
      await context.addInitScript(data => {
        if (!localStorage.getItem("school-os-v1")) localStorage.setItem("school-os-v1", JSON.stringify({ state: data, version: 0 }));
      }, { ...emptyWorkspace(), onboarded: true, subjects: [subject(name)] });
    }
    const desktop = await pc.newPage();
    const mobile = await phone.newPage();
    await open(desktop);
    await open(mobile);
    const names = (page: Page) => page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("school-os-v1")!);
      return data.state.subjects.map((s: { name: string }) => s.name);
    });
    await expect.poll(() => names(desktop), { timeout: 25_000 }).toEqual(expect.arrayContaining(["PC Physik", "Handy Deutsch"]));
    await expect.poll(() => names(mobile), { timeout: 25_000 }).toEqual(expect.arrayContaining(["PC Physik", "Handy Deutsch"]));
    await desktop.getByTitle("Fach hinzufügen", { exact: true }).click();
    await desktop.getByRole("dialog").getByLabel("Titel", { exact: true }).fill("PC Mathematik");
    await desktop.getByRole("dialog").getByRole("button", { name: "Neues Fach erstellen" }).click();
    await expect.poll(() => names(mobile), { timeout: 25_000 }).toContain("PC Mathematik");
    await mobile.getByRole("button", { name: "Menü", exact: true }).click();
    await mobile.getByTitle("Fach hinzufügen", { exact: true }).click();
    await mobile.getByRole("dialog").getByLabel("Titel", { exact: true }).fill("Handy Englisch");
    await mobile.getByRole("dialog").getByRole("button", { name: "Neues Fach erstellen" }).click();
    await expect.poll(() => names(desktop), { timeout: 25_000 }).toContain("Handy Englisch");
    await mobile.reload();
    await expect.poll(() => names(mobile)).toEqual(expect.arrayContaining(["PC Physik", "Handy Deutsch", "PC Mathematik", "Handy Englisch"]));
  } finally {
    await pc.close(); await phone.close(); await account.dispose();
  }
});

test("subject sync requires authentication and isolates accounts; stale copies cannot undo edits or deletions", async ({ playwright, baseURL }) => {
  const a = await playwright.request.newContext({ baseURL });
  const b = await playwright.request.newContext({ baseURL });
  const guest = await playwright.request.newContext({ baseURL });
  try {
    expect((await guest.post("/api/subjects", { data: { subjects: [], deletedIds: [] } })).status()).toBe(401);
    await signup(a); await signup(b);
    const original = subject("Physik");
    const sync = (request: APIRequestContext, subjects = [original], deletedIds: string[] = []) => request.post("/api/subjects", { data: { subjects, deletedIds } });
    expect((await sync(a)).ok()).toBeTruthy();
    expect((await (await sync(b, [])).json()).subjects).toEqual([]);
    // An identical ID belongs independently to each account.
    expect((await sync(b, [{ ...original, name: "Privates Fach" }])).ok()).toBeTruthy();
    const newer = { ...original, name: "Physik neu", updatedAt: new Date(Date.now() + 1000).toISOString() };
    await sync(a, [newer]);
    expect((await (await sync(a)).json()).subjects[0].name).toBe("Physik neu");
    await sync(a, [], [original.id]);
    const stale = await (await sync(a)).json();
    expect(stale.subjects).toEqual([]);
    expect(stale.deletedIds).toContain(original.id);
    expect((await (await sync(b, [])).json()).subjects[0].name).toBe("Privates Fach");
    expect((await a.post("/api/subjects", { headers: { origin: "https://evil.example" }, data: { subjects: [], deletedIds: [] } })).status()).toBe(403);
    expect((await a.post("/api/subjects", { data: { subjects: [{ ...original, id: "invalid" }], deletedIds: [] } })).status()).toBe(400);
  } finally { await a.dispose(); await b.dispose(); await guest.dispose(); }
});
