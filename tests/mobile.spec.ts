import { test, expect, type BrowserContext } from "@playwright/test";

let session: Awaited<ReturnType<BrowserContext["storageState"]>>;

test.beforeAll(async ({ playwright }) => {
  const baseURL = test.info().project.use.baseURL!;
  const request = await playwright.request.newContext({ baseURL });
  const response = await request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL },
    data: { email: `mobile-${Date.now()}@example.test`, password: "mobile-test-password-123", name: "Mobile Test" },
  });
  expect(response.ok()).toBeTruthy();
  session = await request.storageState();
  await request.dispose();
});

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page, context }) => {
  await context.addCookies(session.cookies);
  await page.goto("/");
  // Next's development toolbar overlaps the first bottom tab at phone widths.
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
  await page.getByRole("button", { name: "Workspace öffnen" }).click();
});

test("smartphone shows drawer navigation instead of fixed sidebar", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "Menü", exact: true }),
  ).toBeVisible();
  const sidebar = page.locator(".sidebar");
  await expect(sidebar).not.toHaveClass(/mobile-open/);
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await expect(sidebar).toHaveClass(/mobile-open/);
  await page.getByRole("button", { name: "Navigation schließen" }).click();
  await expect(sidebar).not.toHaveClass(/mobile-open/);
  await expect(sidebar).not.toBeVisible();
});

test("settings panels stack to one column on narrow screens", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Mehr", exact: true }).click();
  await page.locator(".sidebar").getByRole("button", { name: "Einstellungen", exact: true }).click();
  const columns = await page
    .locator(".settings-grid")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(columns.trim().split(/\s+/)).toHaveLength(1);
});

test("bottom navigation, search and creation stay reachable without page overflow", async ({ page }) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
    await expect(nav).toBeVisible();
    for (const label of ["Boards", "Heute", "Aufgaben", "Kalender"]) {
      await nav.getByRole("button", { name: label, exact: true }).click();
      await expect(nav.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    }
    await page.getByRole("button", { name: "Neu erstellen", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Schließen", exact: true }).click();
    await page.locator(".mobile-search").click();
    await expect(page.getByPlaceholder("Fächer, Notizen, Canvas, Aufgaben …")).toBeVisible();
    await page.keyboard.press("Escape");
  }
});

test("drawer closes with Escape and returns focus; desktop has no bottom bar", async ({ page }) => {
  const more = page.getByRole("button", { name: "Mehr", exact: true });
  await more.click();
  await expect(page.locator(".sidebar")).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(page.locator(".sidebar")).not.toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator(".mobile-nav")).not.toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
});

test("pwa manifest and ios icon are served", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const body = await manifest.json();
  expect(body.display).toBe("standalone");
  const icon = await request.get("/apple-touch-icon.png");
  expect(icon.ok()).toBeTruthy();
});
