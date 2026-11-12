import { expect, test } from "@playwright/test";

import { sinDesborde } from "./negocios-ayuda";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-299: tiempo objetivo de primera respuesta a solicitudes, por empresa (apagado por defecto).
// Corre también en `preview-e2e` con el usuario de `qa-e2e`; solo mira, no cambia ajustes.
test.describe("@preview comercial: primera respuesta a solicitudes", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("el ajuste aparece en Comercial › Ajustes y la bandeja carga sin error", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/comercial?seccion=ajustes");
    await expect(page.getByText("Tiempo objetivo de primera respuesta (horas hábiles)").first()).toBeVisible();
    await sinDesborde(page);
    await capturar(page, info, "primera-respuesta-ajuste");

    await page.goto("/solicitudes");
    await expect(page.getByRole("heading", { name: "Solicitudes" }).first()).toBeVisible();
    await expect(page.getByText("No pudimos cargar esta información")).toHaveCount(0);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await sinDesborde(page);
    await capturar(page, info, "primera-respuesta-bandeja");
  });
});
