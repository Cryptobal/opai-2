import { test, expect } from "@playwright/test";

test.describe("Asistencia · fiscalización DT @preview", () => {
  test("portal público y auditoría ERP", async ({ page }) => {
    await page.goto("/fiscalizacion");
    await expect(page.getByRole("heading", { name: "Portal de fiscalización" })).toBeVisible();
    await page.goto("/asistencia/auditoria-fiscalizador");
    await expect(page.getByText("Auditoría de accesos del fiscalizador")).toBeVisible();
  });
});