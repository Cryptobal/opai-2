import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-501 en `preview-e2e`: la ronda en curso trae el botón «Emergencia», separado de las acciones normales y con
// confirmación. Se abre la confirmación, se captura y se cancela (no se envía una alerta real a la Central). Si la
// cuenta `qa-e2e` no tiene Rondas ni la ronda de prueba, captura lo que ve y lo anota como omitido.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview terreno emergencia", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la ronda en curso ofrece Emergencia con confirmación", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/terreno/rondas");
    const enCurso = page.getByRole("region", { name: "Ronda en curso" });
    const iniciar = page.getByRole("region", { name: "Iniciar ronda" });
    const llego = await enCurso
      .or(iniciar)
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (llego && !(await enCurso.isVisible())) {
      const fila = iniciar.getByRole("listitem").first();
      if (await fila.isVisible()) await fila.getByRole("button", { name: "Iniciar" }).click();
    }
    const enRonda = await enCurso
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!enRonda) {
      await capturar(page, info, "terreno-emergencia-sin-ronda");
      info.annotations.push({
        type: "omitido",
        description: "qa-e2e no tiene una ronda para iniciar",
      });
      expect(errores).toEqual([]);
      return;
    }
    await enCurso.getByRole("button", { name: "Emergencia" }).click();
    const dialogo = page.getByRole("dialog", { name: "¿Enviar alerta de emergencia?" });
    await expect(dialogo).toBeVisible();
    await capturar(page, info, "terreno-emergencia-confirmar");
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toHaveCount(0);
    await capturar(page, info, "terreno-emergencia-ronda");
    expect(errores).toEqual([]);
  });
});
