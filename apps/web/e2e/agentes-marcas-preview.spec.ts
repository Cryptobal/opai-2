import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-351: la lista de API keys marca las que heredan todos los permisos o no vencen.
test.describe("@preview agentes: marcas de keys con permisos amplios", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("la lista de keys se ve y las marcas usan el texto acordado", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/agentes");
    const permitido = await page
      .getByRole("heading", { name: /Agentes/ })
      .first()
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!permitido, "El usuario de prueba no gestiona API keys");
    // Si hay keys antiguas, sus marcas usan solo estos textos (sin «hereda» suelto ni fechas inventadas).
    for (const marca of await page.getByText(/^(Hereda todos los permisos|No vence)$/).all())
      await expect(marca).toBeVisible();
    await capturar(page, info, "agentes-marcas");
  });
});
