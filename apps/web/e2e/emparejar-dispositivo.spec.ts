import { expect, test } from "@playwright/test";

// CAR-78 · B2: Terreno › Emparejar (export-terreno/Emparejar). Pantalla pública del equipo de terreno:
// código de 6 caracteres con el aviso único ante un código que no existe, venció o ya se usó.
// Capturas a 375, 1024 y 1280 px, en claro y oscuro, en e2e/__screenshots__/.
for (const tema of ["light", "dark"] as const) {
  test.describe(`tema ${tema}`, () => {
    test.use({ colorScheme: tema });

    test("pide el código y avisa si no existe", async ({ page }, info) => {
      await page.goto("/terreno/emparejar");
      await expect(page.getByRole("heading", { name: "Emparejar este dispositivo" })).toBeVisible();
      await page.screenshot({
        path: `e2e/__screenshots__/emparejar-${tema}-${info.project.name}.png`,
        fullPage: true,
      });
      const boton = page.getByRole("button", { name: "Emparejar", exact: true });
      expect((await boton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      await page.getByLabel("Código").fill("ZZZZZZ");
      await boton.click();
      await expect(page.getByText("El código no existe o venció")).toBeVisible();
    });
  });
}

test("el código del QR llega precargado", async ({ page }) => {
  await page.goto("/terreno/emparejar?c=ABC234");
  await expect(page.getByLabel("Código")).toHaveValue("ABC234");
});
