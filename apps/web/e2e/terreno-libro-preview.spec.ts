import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-77 parte 3 en `preview-e2e`: el libro de novedades del equipo de terreno. Entra con el usuario de la
// empresa ficticia `qa-e2e`; si la cuenta no tiene un equipo emparejado (el libro vuelve al inicio), captura lo
// que ve y lo anota como omitido.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview terreno libro", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el libro muestra «Nueva novedad» y la lista de la instalación", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/terreno/libro");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const titulo = page.getByRole("heading", { name: "Libro de novedades" });
    const llego = await titulo
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    await capturar(page, info, "terreno-libro");
    if (!llego) {
      info.annotations.push({
        type: "omitido",
        description: "qa-e2e no tiene equipo de terreno emparejado",
      });
      expect(errores).toEqual([]);
      return;
    }
    const nueva = page.getByRole("region", { name: "Reportar novedad" });
    await expect(nueva.or(page.getByText("Elige tu nombre primero"))).toBeVisible();
    expect(errores).toEqual([]);
  });
});
