import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";

// CAR-515 y CAR-516: Google bloquea su ingreso en las vistas web de las apps; dentro de la app el botón
// abre el navegador del sistema (plugin de Capacitor) y nunca navega a Google desde la vista web.
const AGENTE_APP =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 OPAIApp/opai";

test.describe("@preview app nativa: ingreso con Google por el navegador del sistema", () => {
  test.use({ userAgent: AGENTE_APP });

  test("dentro de la app, Google no navega desde la vista web", async ({ page }, info) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/login");
    await expect(page.getByLabel("Correo")).toBeVisible();
    await capturar(page, info, "app-nativa-login");
    const google = page.getByRole("button", { name: "Continuar con Google" });
    if ((await google.count()) === 0) return; // Google sin configurar en esta vista previa.
    // Sin el plugin del navegador del sistema (Playwright no es la app), el botón no hace nada.
    await google.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("un canje sin verificador avisa y ofrece volver al ingreso", async ({ page }, info) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/app/canje?codigo=codigo-que-no-existe");
    await expect(page.getByText("No pudimos completar el ingreso")).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al ingreso" })).toBeVisible();
    await capturar(page, info, "app-nativa-canje-error");
  });
});
