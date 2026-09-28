import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workspace öffnen" }).click();
});
test("tasks and rich text notes persist after reload", async ({ page }) => {
  await page
    .getByRole("button", {
      name: "Übungsblatt: Quadratische Funktionen abschließen",
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Aufgaben 2", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schnell erfassen" }).click();
  await page
    .getByRole("textbox", { name: "Titel", exact: true })
    .fill("Persistenz-Test");
  await page.getByRole("button", { name: "Neue Notiz erstellen" }).click();
  await page.locator(".tiptap").fill("Mein gespeicherter Lernstoff.");
  await page.reload();
  await page.getByRole("button", { name: "Notizen", exact: true }).click();
  await page.getByRole("button", { name: /Persistenz-Test/ }).click();
  await expect(page.locator(".tiptap")).toContainText(
    "Mein gespeicherter Lernstoff.",
  );
});
test("canvas draws and restores a shape from IndexedDB", async ({ page }) => {
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await page.getByRole("button", { name: /Mathe · Gedankenraum/ }).click();
  const canvas = page.locator(".excalidraw__canvas.interactive");
  await expect(canvas).toBeVisible();
  await page.getByTitle("Rechteck — R oder 2", { exact: true }).click();
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 350, box!.y + 230);
  await page.mouse.down();
  await page.mouse.move(box!.x + 510, box!.y + 330, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".canvas-bar")).toContainText("Lokal gespeichert");
  await page.reload();
  await page.getByRole("button", { name: "Canvas", exact: true }).click();
  await page.getByRole("button", { name: /Mathe · Gedankenraum/ }).click();
  await expect(page.locator(".excalidraw__canvas.interactive")).toBeVisible();
  const count = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("keyval-store");
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    const data = await new Promise<unknown[]>((resolve, reject) => {
      const r = db.transaction("keyval").objectStore("keyval").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    db.close();
    return data
      .flatMap((v) => (v as { elements?: { type: string }[] }).elements || [])
      .filter((e) => e.type === "rectangle").length;
  });
  expect(count).toBeGreaterThan(0);
});
test("file upload persists and text can be previewed", async ({ page }) => {
  await page.getByRole("button", { name: "Dateien", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "lernstof.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Fotosynthese braucht Licht."),
    });
  await expect(
    page.getByRole("button", { name: /lernstof.txt/ }).first(),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Dateien", exact: true }).click();
  await page
    .getByRole("button", { name: /lernstof.txt/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Fotosynthese braucht Licht.",
  );
});
test("chat renders SSE and saves output as a note", async ({ page }) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: 'data: {"choices":[{"delta":{"content":"Eine Parabel ist der Graph einer quadratischen Funktion."}}]}\n\ndata: [DONE]\n\n',
    }),
  );
  await page.getByRole("button", { name: "KI-Assistent AI" }).click();
  await page
    .getByRole("textbox", { name: "Nachricht an KI" })
    .fill("Was ist eine Parabel?");
  await page.getByRole("button", { name: "Nachricht senden" }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "Graph einer quadratischen Funktion",
  );
  await page.getByRole("button", { name: "Als Notiz", exact: true }).click();
  await page.getByRole("button", { name: "Notizen", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /KI · Eine Parabel/ }),
  ).toBeVisible();
});
test("mobile navigation and keyboard search work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await page.getByRole("button", { name: "Kalender", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kalender", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder("Fächer, Notizen, Canvas, Aufgaben …")
    .fill("Quadratische");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: /Quadratische Funktionen Notiz/ }),
  ).toBeVisible();
});
test("chat rejects cross-origin and malformed requests", async ({
  request,
}) => {
  const invalid = await request.post("/api/chat", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { messages: [] },
  });
  expect(invalid.status()).toBe(400);
  const cross = await request.post("/api/chat", {
    headers: { Origin: "https://untrusted.example" },
    data: { messages: [{ role: "user", content: "Hallo" }] },
  });
  expect(cross.status()).toBe(403);
});
