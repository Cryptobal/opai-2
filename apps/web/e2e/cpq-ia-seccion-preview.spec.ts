import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { abrirDisenadorDePropuesta } from "./propuesta-ayuda";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// IA por sección de la propuesta (CAR-534) en `preview-e2e`, a 375, 1024 y 1280 px, con `qa-e2e`.
// Pide un borrador y lo descarta: el texto guardado de la sección no cambia sin «Aceptar borrador».
test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);

test.describe("@preview cpq: IA por sección en el detalle de la cotización", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("redactar con IA muestra un borrador que se acepta o descarta", async ({ page }, info) => {
    await entrar(page);
    await abrirDisenadorDePropuesta(
      page,
      `IA sección ${info.project.name} ${Date.now()}`,
      "Propuesta con IA",
    );
    await expect(page.getByRole("list", { name: "Bloques de la propuesta" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("region", { name: "Documento de la propuesta" })).toBeVisible();
    const textos = page.getByRole("group", { name: "Textos de la propuesta" });
    const seccion = textos.getByRole("group").first();
    await seccion.getByRole("button", { name: "Redactar con IA" }).click();
    const borrador = seccion.getByRole("region", { name: "Borrador de IA" });
    await expect(borrador.or(seccion.getByRole("status")).first()).toBeVisible({ timeout: 60_000 });
    await seccion.scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-ia-seccion");
    if (await borrador.isVisible()) {
      await borrador.getByRole("button", { name: "Descartar" }).click();
      await expect(borrador).toHaveCount(0);
    }
  });
});
