import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { emptyWorkspace } from "../src/lib/demo";
import { randomUUID } from "node:crypto";

let session: Awaited<ReturnType<BrowserContext["storageState"]>>;
const firstId = randomUUID();
const secondId = randomUUID();
const subjectId = randomUUID();
const otherSubjectId = randomUUID();
const noteId = randomUUID();
const boardId = randomUUID();
const now = new Date().toISOString();
const workspace = {
  ...emptyWorkspace(),
  onboarded: true,
  notes: [{ id: noteId, subjectId, title: "Notiz zum Verschieben", content: "<p>Inhalt bleibt</p>", createdAt: now, updatedAt: now }],
  boards: [{ id: boardId, subjectId, title: "Whiteboard zum Verschieben", createdAt: now, updatedAt: now }],
  files: [{ id: randomUUID(), subjectId, name: "Material.txt", type: "text/plain", size: 10, createdAt: now, updatedAt: now }],
  tasks: [{ id: randomUUID(), subjectId, title: "Aufgabe", due: "2026-10-21", priority: "normal" as const, status: "todo" as const, createdAt: now, updatedAt: now }],
  exams: [{ id: randomUUID(), subjectId, title: "Prüfung", date: "2026-10-21", topics: "Zellen", createdAt: now, updatedAt: now }],
  subjects: [
    { id: otherSubjectId, name: "Chemie", color: "#428572", icon: "C", teacher: "", room: "", createdAt: now, updatedAt: now },
    {
      id: subjectId,
      name: "Biologie",
      color: "#428572",
      icon: "B",
      teacher: "",
      room: "",
      createdAt: now,
      updatedAt: now,
    },
  ],
  flashcards: [
    {
      id: firstId,
      front: "Zellkern",
      back: "Steuert die Zelle",
      subjectId,
      known: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: secondId,
      front: "Mitochondrien",
      back: "Kraftwerke der Zelle",
      subjectId,
      known: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
};

async function openCards(page: Page) {
  await page.goto("/");
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
  if (
    await page.getByRole("button", { name: "Menü", exact: true }).isVisible()
  ) {
    await page.getByRole("button", { name: "Menü", exact: true }).click();
  }
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Lernkarten", exact: true })
    .click();
}
const study = (page: Page) =>
  page.getByRole("region", { name: "Karteikarten lernen" });
const current = (page: Page) =>
  study(page).getByRole("button", { name: /Zum Umdrehen klicken/ });

test.beforeEach(async ({ playwright }) => {
  const request = await playwright.request.newContext({
    baseURL: test.info().project.use.baseURL!,
  });
  const response = await request.post("/api/auth/sign-up/email", {
    headers: { origin: test.info().project.use.baseURL!, "x-real-ip": `198.51.100.${test.info().testId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 250 + 1}` },
    data: {
      email: `learn-${randomUUID()}@example.test`,
      password: "learn-test-password-123",
      name: "Lernkarten Test",
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  session = await request.storageState();
  await request.dispose();
});

test.beforeEach(async ({ context, page }) => {
  await context.addCookies(session.cookies);
  await context.addInitScript((data) => {
    if (!localStorage.getItem("school-os-v1")) {
      localStorage.setItem(
        "school-os-v1",
        JSON.stringify({ state: data, version: 0 }),
      );
    }
  }, workspace);
  await openCards(page);
});

test("flip, keyboard navigation, assessment and missed-only round persist", async ({
  page,
}) => {
  await expect(current(page)).toHaveAccessibleName(/Frage: Zellkern/);
  await page.screenshot({
    path: "test-results/learn-desktop-check.png",
    fullPage: true,
  });
  await current(page).press("Space");
  await expect(current(page)).toHaveAccessibleName(
    /Antwort: Steuert die Zelle/,
  );
  await page.keyboard.press("ArrowLeft");
  await expect(current(page)).toHaveAccessibleName(/Frage: Mitochondrien/);
  await page.keyboard.press("ArrowRight");
  await expect(study(page).getByRole("status")).toContainText(
    "1 von 2 Karten gewusst",
  );
  await expect(study(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  await page.getByRole("button", { name: "Nicht gewusste Karten nochmals lernen (1)" }).click();
  await expect(current(page)).toHaveAccessibleName(/Frage: Zellkern/);
  await expect(study(page).getByText("1 / 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Gewusst/ }).click();
  await expect(study(page).getByRole("status")).toContainText("Alles gewusst");
  await page.reload();
  await openCards(page);
  await expect(page.locator(".view-actions")).toContainText(
    "2 von 2 Karten gelernt",
  );
  await expect(current(page)).toHaveAccessibleName(/Frage: Zellkern/);
});

test("options, mixing and autoplay do not lose cards or mark them learned", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Karten mischen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Karten mischen", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(study(page).getByText("1 / 2", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Karten mischen", exact: true })
    .click();
  await expect(current(page)).toHaveAccessibleName(/Frage: Zellkern/);
  await page.getByRole("button", { name: "Optionen" }).click();
  await page.getByLabel("Antwort zuerst").check();
  await page.getByLabel("Karten sortieren").uncheck();
  await page.getByRole("button", { name: "Fertig", exact: true }).click();
  await expect(current(page)).toHaveAccessibleName(
    /Antwort: Steuert die Zelle/,
  );
  await expect(
    study(page).getByRole("button", { name: /Noch üben/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Automatische Wiedergabe starten" })
    .click();
  await expect(current(page)).toHaveAccessibleName(/Frage: Zellkern/, {
    timeout: 5000,
  });
  await expect(current(page)).toHaveAccessibleName(
    /Antwort: Kraftwerke der Zelle/,
    { timeout: 5000 },
  );
  await page
    .getByRole("button", { name: "Automatische Wiedergabe pausieren" })
    .click();
  await expect(page.locator(".view-actions")).toContainText(
    "0 von 2 Karten gelernt",
  );
});

test("import, editing, deletion and progress reset survive reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Liste importieren" }).click();
  await page
    .getByLabel("Karteikarten-Liste")
    .fill("Fotosynthese\tBraucht Licht\nUngültig\nChlorophyll | Blattgrün");
  await page.getByRole("button", { name: "Importieren", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "2 Karten importiert · 1 Zeilen übersprungen",
  );
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await page
    .getByRole("button", { name: "Karte 3 bearbeiten", exact: true })
    .click();
  await page.getByLabel("Frage", { exact: true }).fill("Photosynthese");
  await page.getByRole("button", { name: "Änderungen speichern" }).click();
  await page.reload();
  await openCards(page);
  await expect(
    page.getByRole("region", { name: "Karten in diesem Lernset" }),
  ).toContainText("Photosynthese");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Karte 4 bearbeiten", exact: true }).click();
  await page.getByRole("button", { name: "Lernkarte löschen", exact: true }).click();
  await page.getByRole("button", { name: /^Gewusst/ }).click();
  await page.getByRole("button", { name: "Optionen" }).click();
  await page
    .getByRole("button", { name: "Lernfortschritt zurücksetzen" })
    .click();
  await page.reload();
  await openCards(page);
  await expect(page.locator(".view-actions")).toContainText(
    "0 von 3 Karten gelernt",
  );
  await expect(
    page.getByRole("region", { name: "Karten in diesem Lernset" }),
  ).not.toContainText("Chlorophyll");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("phone cards support swipe assessment, focus mode and long text without horizontal overflow", async ({
    page,
  }) => {
    await expect
      .poll(() =>
        page
          .locator(".sidebar")
          .evaluate((node) => node.getBoundingClientRect().right),
      )
      .toBeLessThanOrEqual(0);
    await page.screenshot({
      path: "test-results/learn-mobile-check.png",
      fullPage: true,
    });
    await current(page).dispatchEvent("touchstart", {
      touches: [{ identifier: 0, clientX: 300, clientY: 350 }],
    });
    await current(page).dispatchEvent("touchend", {
      changedTouches: [{ identifier: 0, clientX: 100, clientY: 350 }],
    });
    await expect(current(page)).toHaveAccessibleName(/Frage: Mitochondrien/);
    await current(page).dispatchEvent("touchstart", {
      touches: [{ identifier: 0, clientX: 100, clientY: 350 }],
    });
    await current(page).dispatchEvent("touchend", {
      changedTouches: [{ identifier: 0, clientX: 300, clientY: 350 }],
    });
    await expect(study(page).getByRole("status")).toContainText(
      "1 von 2 Karten gewusst",
    );
    await page.getByRole("button", { name: "Alle wiederholen" }).click();
    await page
      .getByRole("button", { name: "Lernkarte bearbeiten", exact: true })
      .click();
    await page
      .getByLabel("Antwort", { exact: true })
      .fill("Langer Kartentext. ".repeat(100));
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await current(page).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await current(page).boundingBox())!.height).toBeLessThan(400);
    await page.getByRole("button", { name: "Fokusmodus starten" }).click();
    await expect(
      page.getByRole("region", { name: "Karten in diesem Lernset" }),
    ).toHaveCount(0);
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: /^Gewusst/ }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("region", { name: "Karten in diesem Lernset" }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/learn-mobile-long-text-check.png",
      fullPage: true,
    });
  });
});


test("categories filter cards, apply to new cards and survive reload", async ({ page }) => {
  await page.getByRole("button", { name: "Kategorie erstellen", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("Zellbiologie");
  await page.getByRole("dialog").getByRole("button", { name: "Kategorie erstellen", exact: true }).click();
  await expect(page.getByLabel("Kategorie", { exact: true })).toHaveValue("Zellbiologie");
  await page.getByRole("button", { name: "Erste Lernkarte erstellen" }).click();
  await expect(page.getByRole("dialog").getByLabel("Kategorie", { exact: true })).toHaveValue("Zellbiologie");
  await page.getByLabel("Frage", { exact: true }).fill("Ribosomen");
  await page.getByLabel("Antwort", { exact: true }).fill("Bilden Proteine");
  await page.getByRole("button", { name: "Neue Lernkarte erstellen", exact: true }).click();
  await expect(current(page)).toHaveAccessibleName(/Frage: Ribosomen/);
  await expect(study(page).getByText("1 / 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lernkarte bearbeiten", exact: true }).click();
  await page.getByLabel("Frage", { exact: true }).press("ArrowRight");
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.locator(".view-actions")).toContainText("0 von 1 Karten gelernt");
  await page.reload();
  await openCards(page);
  await page.getByLabel("Kategorie", { exact: true }).selectOption("Zellbiologie");
  await expect(current(page)).toHaveAccessibleName(/Frage: Ribosomen/);
  await expect(page.getByRole("button", { name: /Karte \d löschen/ })).toHaveCount(0);
  await page.getByLabel("Kategorie", { exact: true }).selectOption("__none");
  await expect(study(page).getByText("1 / 2", { exact: true })).toBeVisible();
});

test("subjects can be edited and deleted while moving all their contents", async ({ page }) => {
  await page.locator(".subject-nav").getByRole("button", { name: "Biologie", exact: true }).click();
  await page.getByRole("button", { name: "Fach bearbeiten", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("Naturwissenschaften");
  await page.getByRole("dialog").getByLabel("Lehrkraft").fill("Frau Test");
  await page.getByRole("button", { name: "Änderungen speichern", exact: true }).click();
  await expect(page.locator(".subject-nav")).toContainText("Naturwissenschaften");
  await page.getByRole("button", { name: "Fach löschen", exact: true }).click();
  await page.getByLabel("Inhalte verschieben nach").selectOption(otherSubjectId);
  await page.getByRole("button", { name: "Fach löschen und Inhalte behalten", exact: true }).click();
  await expect(page.locator(".subject-nav")).not.toContainText("Naturwissenschaften");
  await openCards(page);
  await expect(current(page)).toHaveAccessibleName(/Frage: Zellkern/);
  await expect.poll(() => page.evaluate(() => ["notes", "boards", "files", "tasks", "exams", "flashcards"].every(kind => JSON.parse(localStorage.getItem("school-os-v1")!).state[kind].every((c: {subjectId: string | null}) => c.subjectId === JSON.parse(localStorage.getItem("school-os-v1")!).state.subjects.find((s: {name: string}) => s.name === "Chemie").id)))).toBe(true);
  await page.reload();
  await openCards(page);
  await expect(page.locator(".subject-nav")).not.toContainText("Naturwissenschaften");
  await page.locator(".subject-nav").getByRole("button", { name: "Chemie", exact: true }).click();
  await page.getByRole("button", { name: "Fach löschen", exact: true }).click();
  await page.getByRole("button", { name: "Fach löschen und Inhalte behalten", exact: true }).click();
  await expect.poll(() => page.evaluate(() => ["notes", "boards", "files", "tasks", "exams", "flashcards"].every(kind => JSON.parse(localStorage.getItem("school-os-v1")!).state[kind].every((item: {subjectId: string | null}) => item.subjectId === null)))).toBe(true);
});


test("individual notes and whiteboards move to another subject without losing contents", async ({ page }) => {
  await page.locator(".sidebar").getByRole("button", { name: "Notizen", exact: true }).click();
  await page.getByRole("button", { name: /Notiz zum Verschieben/ }).click();
  await expect(page.locator(".tiptap")).toContainText("Inhalt bleibt");
  await page.getByLabel("In anderes Fach verschieben").selectOption(otherSubjectId);
  await expect(page.locator(".tiptap")).toContainText("Inhalt bleibt");
  await page.locator(".sidebar").getByRole("button", { name: "Whiteboards", exact: true }).click();
  await page.locator(".whiteboard-card").filter({ hasText: "Whiteboard zum Verschieben" }).getByLabel("In anderes Fach verschieben").selectOption(otherSubjectId);
  await page.reload();
  await expect(page.locator(".whiteboard-card").filter({ hasText: "Whiteboard zum Verschieben" }).getByLabel("In anderes Fach verschieben")).toHaveValue(otherSubjectId);
  await page.locator(".sidebar").getByRole("button", { name: "Notizen", exact: true }).click();
  await page.getByRole("button", { name: /Notiz zum Verschieben/ }).click();
  await expect(page.getByLabel("In anderes Fach verschieben")).toHaveValue(otherSubjectId);
  await expect(page.locator(".tiptap")).toContainText("Inhalt bleibt");
});
