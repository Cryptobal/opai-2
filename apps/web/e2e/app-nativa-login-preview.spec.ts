import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";

// CAR-515: Google bloquea su ingreso en las vistas web de las apps, así que la app nativa no lo ofrece.
const AGENTE_APP =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 OPAIApp/opai";

test.describe("@preview app nativa: ingreso sin Google", () => {
  test.use({ userAgent: AGENTE_APP });

  test("dentro de la app el ingreso muestra correo y contraseña, sin Google", async ({
    page,
  }, info) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/login");
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toHaveCount(0);
    await capturar(page, info, "app-nativa-login");
  });
});
