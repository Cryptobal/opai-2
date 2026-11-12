import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Meses cerrados de Desempeño (CAR-322): cierra a mano el mes anterior desde la pestaña, con
// confirmación, y lo ve en la lista. Cerrar no se deshace: corre una sola vez (escritorio) y, si el
// mes ya estaba cerrado en esta base, solo comprueba que aparece.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("desempeño: meses cerrados", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("cierra el mes anterior con confirmación y queda en la lista", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Escribe datos: corre una vez");
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/desempeno/cierres");
    await expect(page.getByRole("link", { name: "Meses cerrados" })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "desempeno-cierres");

    const cerrar = page.getByRole("button", { name: /^Cerrar / }).first();
    if (await cerrar.count()) {
      const mes = ((await cerrar.textContent()) ?? "").replace(/^Cerrar /, "").trim();
      await cerrar.click();
      const dialogo = page.getByRole("alertdialog").or(page.getByRole("dialog"));
      await expect(dialogo.getByText(/no se puede reabrir/)).toBeVisible();
      // Espera la simulación (cuántas personas quedan fijas) y el fin de la animación de entrada.
      await expect(dialogo.getByText(/Se guarda el resultado de \d|quedará cerrado vacío/)).toBeVisible();
      await page.waitForTimeout(300);
      await capturar(page, info, "desempeno-cierres-confirmar");
      await dialogo.getByRole("button", { name: `Cerrar ${mes}` }).click();
      await expect(page.getByText(`Listo: ${mes} quedó cerrado`)).toBeVisible();
      await expect(page.getByRole("button", { name: /^Cerrar / })).toHaveCount(0);
      await expect(page.getByText(mes).filter({ visible: true }).first()).toBeVisible();
    } else {
      await expect(page.getByText("A mano").or(page.getByText("Automático")).first()).toBeVisible();
    }
    await capturar(page, info, "desempeno-cierres-cerrado");
    expect(errores).toEqual([]);
  });
});
