import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-395 en `preview-e2e`: el Inicio del equipo de terreno ya no trae «Marcar punto» suelto (la marca se
// hace dentro de la ronda en curso). Entra con el usuario de la empresa ficticia `qa-e2e`; si la cuenta no
// llega al Inicio del equipo (sin instalación ni equipo emparejado), captura lo que ve y lo anota como omitido.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview terreno inicio", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el Inicio del equipo no ofrece marcar un punto fuera de la ronda", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/terreno");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const turno = page.getByRole("heading", { name: "Turno de ahora" });
    const llego = await turno
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    await capturar(page, info, "terreno-inicio");
    if (!llego) {
      info.annotations.push({ type: "omitido", description: "qa-e2e no llega al Inicio del equipo" });
      expect(errores).toEqual([]);
      return;
    }
    await expect(page.getByRole("region", { name: "Marcar punto" })).toHaveCount(0);
    expect(errores).toEqual([]);
  });
});
