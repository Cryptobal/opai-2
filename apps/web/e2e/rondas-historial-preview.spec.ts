import { expect, test } from "@playwright/test";

test.describe("@preview Rondas historial", () => {
  test("1280 · listado", async ({ page }) => {
    await page.goto("/rondas/historial");
    await expect(page.getByRole("heading", { name: "Historial de rondas" })).toBeVisible();
  });

  test("375 · listado", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/rondas/historial");
    await expect(page.getByRole("heading", { name: "Historial de rondas" })).toBeVisible();
  });
});