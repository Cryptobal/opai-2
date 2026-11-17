import { expect, test } from "@playwright/test";

test.describe("@preview Rondas informe", () => {
  test("1280 · cumplimiento del mes", async ({ page }) => {
    await page.goto("/rondas/informe");
    await expect(page.getByRole("heading", { name: "Cumplimiento del mes" })).toBeVisible();
  });

  test("375 · cumplimiento del mes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/rondas/informe");
    await expect(page.getByRole("heading", { name: "Cumplimiento del mes" })).toBeVisible();
  });
});