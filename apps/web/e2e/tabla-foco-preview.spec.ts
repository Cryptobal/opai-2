import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-364 (Sesión Diseño): la zona desplazable de una tabla del DS se alcanza con el teclado (axe
// `scrollable-region-focusable`). Corre en `preview-e2e` con el usuario de la empresa ficticia `qa-e2e`.
test.describe("@preview tabla alcanzable con el teclado", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("el calendario de feriados recibe el foco y muestra el anillo", async ({ page }, info) => {
    test.setTimeout(150_000);
    await entrar(page);
    await page.goto("/configuracion/calendario");
    const zona = page.getByRole("region", { name: "Tabla" }).first();
    await expect(zona).toBeVisible({ timeout: 60_000 });
    await expect(zona).toHaveAttribute("tabindex", "0");
    await zona.focus();
    await expect(zona).toBeFocused();
    await capturar(page, info, "tabla-foco-calendario");
  });
});
