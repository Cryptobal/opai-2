import { expect, test } from "@playwright/test";

test.describe("@preview asistencia: enlace público de marcación", () => {
  test("muestra enlace inválido sin datos internos", async ({ page }) => {
    await page.goto("/marcar/ZZZZZZZZ");
    await expect(page.getByRole("alert").filter({ hasText: "Enlace no válido" })).toBeVisible();
  });
});