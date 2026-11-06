import { expect, test } from "@playwright/test";

// CAR-78 · B2: Terreno › Emparejar (export-terreno/Emparejar). Pantalla pública del equipo de terreno:
// código de 6 caracteres con el aviso único ante un código que no existe, venció o ya se usó.
// Capturas a 375, 1024 y 1280 px, en claro y oscuro, en e2e/__screenshots__/.
for (const tema of ["light", "dark"] as const) {
  test.describe(`tema ${tema}`, () => {
    test.use({ colorScheme: tema });

    test("pide el código y deja el botón a 44 px", async ({ page }, info) => {
      await page.goto("/terreno/emparejar");
      await expect(page.getByRole("heading", { name: "Emparejar este dispositivo" })).toBeVisible();
      await page.screenshot({
        path: `e2e/__screenshots__/emparejar-${tema}-${info.project.name}.png`,
        fullPage: true,
      });
      const boton = page.getByRole("button", { name: "Emparejar", exact: true });
      expect((await boton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
  });
}

// El canje cuenta 3 intentos por origen cada 10 minutos (fallo cerrado): un código falso se envía una
// sola vez en toda la corrida (solo en escritorio, sin reintento que lo repita).
test("un código que no existe avisa lo mismo que uno vencido", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "un solo envío por corrida: el límite es de 3 intentos");
  await page.goto("/terreno/emparejar");
  await page.getByLabel("Código").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Emparejar", exact: true }).click();
  await expect(page.getByText("El código no existe o venció")).toBeVisible();
});

test("el código del QR llega precargado", async ({ page }) => {
  await page.goto("/terreno/emparejar?c=ABC234");
  await expect(page.getByLabel("Código")).toHaveValue("ABC234");
});
