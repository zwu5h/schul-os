import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workspace öffnen" }).click();
});
test("tasks and rich text notes persist after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Heute", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Übungsblatt: Quadratische Funktionen abschließen",
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Aufgaben 2", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Heute", exact: true }).click();
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
  await page.getByRole("button", { name: "Whiteboards", exact: true }).click();
  await page
    .locator(".whiteboard-open")
    .filter({ hasText: "Mathe · Gedankenraum" })
    .click();
  const canvas = page.locator(".excalidraw__canvas.interactive");
  await expect(canvas).toBeVisible();
  await page.getByTitle("Rechteck — R oder 2", { exact: true }).click();
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 350, box!.y + 230);
  await page.mouse.down();
  await page.mouse.move(box!.x + 510, box!.y + 330, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".whiteboard-title-group")).toContainText(
    "Lokal gespeichert",
  );
  await page.reload();
  await page.getByRole("button", { name: "Whiteboards", exact: true }).click();
  await page
    .locator(".whiteboard-open")
    .filter({ hasText: "Mathe · Gedankenraum" })
    .click();
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
  await page.locator("input[type=file]").setInputFiles({
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

test("whiteboards can be named, assigned, switched, exported and reopened", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Deine Ideen brauchen Platz." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Neues Whiteboard", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Titel", exact: true })
    .fill("Physik Skizzen");
  await page
    .getByLabel("Fach", { exact: true })
    .selectOption({ label: "Mathematik" });
  await page
    .getByRole("button", { name: "Neues Whiteboard erstellen" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Whiteboard-Name" }),
  ).toHaveValue("Physik Skizzen");
  await page
    .getByRole("textbox", { name: "Whiteboard-Name" })
    .fill("Mechanik · Kräfte");
  await page.getByRole("textbox", { name: "Whiteboard-Name" }).press("Enter");
  const canvas = page.locator(".excalidraw__canvas.interactive");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Stift", exact: true }).click();
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 350, box!.y + 180);
  await page.mouse.down();
  await page.mouse.move(box!.x + 400, box!.y + 230, { steps: 8 });
  await page.mouse.move(box!.x + 470, box!.y + 180, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(".whiteboard-title-group")).toContainText(
    "Lokal gespeichert",
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByTitle("Bearbeitbares Whiteboard herunterladen").click();
  const exported = await downloadEvent;
  expect(exported.suggestedFilename()).toBe("Mechanik · Kräfte.excalidraw");
  const exportedPath = await exported.path();
  expect(exportedPath).toBeTruthy();
  await page.getByRole("button", { name: "Neues Board", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Titel", exact: true })
    .fill("Zweites Whiteboard");
  await page
    .getByRole("button", { name: "Neues Whiteboard erstellen" })
    .click();
  await page
    .getByRole("combobox", { name: "Whiteboard wechseln" })
    .selectOption({ label: "Mechanik · Kräfte" });
  await expect(
    page.getByRole("textbox", { name: "Whiteboard-Name" }),
  ).toHaveValue("Mechanik · Kräfte");
  await page.getByRole("button", { name: "Zur Whiteboard-Übersicht" }).click();
  await expect(
    page.locator(".whiteboard-open").filter({ hasText: "Zweites Whiteboard" }),
  ).toBeVisible();
  await page.reload();
  await page
    .locator(".whiteboard-open")
    .filter({ hasText: "Mechanik · Kräfte" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Fach des Whiteboards" }),
  ).not.toHaveValue("");
  await page.getByRole("button", { name: "Zur Whiteboard-Übersicht" }).click();
  await page
    .locator(".board-search input[type=file]")
    .setInputFiles(exportedPath!);
  await expect(page.locator(".excalidraw__canvas.interactive")).toBeVisible();
  await expect(page.locator(".whiteboard-title-group")).toContainText(
    "Lokal gespeichert",
  );
  const strokes = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("keyval-store");
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const r = db.transaction("keyval").objectStore("keyval").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    db.close();
    return records
      .flatMap((v) => (v as { elements?: { type: string }[] }).elements || [])
      .filter((e) => e.type === "freedraw").length;
  });
  expect(strokes).toBeGreaterThanOrEqual(2);
});

test("flashcards can be imported from a pasted list", async ({ page }) => {
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Lernkarten", exact: true })
    .click();
  const counter = page.locator(".view-actions span").first();
  await expect(counter).toContainText("Karten gelernt");
  const before = await counter.innerText();
  const total = Number(before.match(/von (\d+)/)?.[1] ?? 0);
  await page.getByRole("button", { name: "Liste importieren" }).click();
  await page
    .getByLabel("Karteikarten-Liste", { exact: true })
    .fill(
      "Zellkern | steuert die Zelle\n\nOhne Trennzeichen\nMitochondrien | Kraftwerk der Zelle",
    );
  await page.getByRole("button", { name: "Importieren", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("2 Karten importiert");
  await expect(counter).toContainText(`von ${total + 2}`);
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Lernkarten", exact: true })
    .click();
  await expect(page.locator(".view-actions span").first()).toContainText(
    `von ${total + 2}`,
  );
});

test("subject hub links to whiteboards and flashcards", async ({ page }) => {
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Mathematik", exact: true })
    .click();
  await expect(
    page.getByText("Alles zu Mathematik, an einem Ort."),
  ).toBeVisible();
  await page
    .locator(".subject-actions")
    .getByRole("button", { name: /Whiteboards/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mathematik", exact: true }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Mathematik", exact: true })
    .click();
  await page
    .locator(".subject-actions")
    .getByRole("button", { name: /Lernkarten/ })
    .click();
  await expect(page.locator(".view-actions span").first()).toContainText(
    "Karten gelernt",
  );
});

test("timetable can be imported from JSON and shows in calendar", async ({
  page,
}) => {
  const today = await page.evaluate(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const payload = JSON.stringify({
    lessons: [
      {
        subject: "Mathematik",
        start: `${today}T08:00`,
        end: `${today}T08:50`,
        room: "B207",
      },
      {
        subject: "Physik",
        start: `${today}T09:00`,
        end: `${today}T09:50`,
        room: "B208",
      },
    ],
  });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /WebUntis/ })
    .click();
  await page
    .getByLabel("Stundenplan-JSON", { exact: true })
    .fill("kein json");
  await page.getByRole("button", { name: "Prüfen", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "JSON" }),
  ).toContainText("kein gültiges JSON");
  await page.getByLabel("Stundenplan-JSON", { exact: true }).fill(payload);
  await page.getByRole("button", { name: "Prüfen", exact: true }).click();
  await expect(page.getByText("2 Stunden bereit")).toBeVisible();
  await expect(page.getByText("Neue Fächer: Physik")).toBeVisible();
  await page.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("2 Stunden übernommen");
  await expect(
    page.getByText("2 Stunden per JSON importiert"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kalender", exact: true }).click();
  await expect(page.getByText("B207")).toBeVisible();
  await expect(page.getByText("B208")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Kalender", exact: true }).click();
  await expect(page.getByText("B207")).toBeVisible();
});
