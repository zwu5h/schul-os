import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
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
  await page.getByRole("button", { name: "Menü schließen" }).click();
  await expect(sidebar).not.toHaveClass(/mobile-open/);
});

test("settings panels stack to one column on narrow screens", async ({
  page,
}) => {
  await page.locator(".sidebar").getByRole("button", { name: /WebUntis/ }).click();
  const columns = await page
    .locator(".settings-grid")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(columns.trim().split(/\s+/)).toHaveLength(1);
});
