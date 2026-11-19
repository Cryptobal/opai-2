import { expect, type Page, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

const RESUMEN = /^(\d+) novedad(?:es)? sin leer$|^Estás al día/;

async function pendientes(page: Page): Promise<number> {
  const texto = (await page.getByText(RESUMEN).first().textContent()) ?? "";
  return Number(/^(\d+)/.exec(texto)?.[1] ?? 0);
}

test.describe("@preview novedades filtro No leídas al marcar", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("marcar como leída quita la tarjeta al instante y baja el contador", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "marcar solo en desktop (usuario compartido)");

    await entrar(page);
    await page.goto("/novedades");
    await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });

    const filtro = page.getByRole("group", { name: "Filtrar novedades" });
    await filtro.getByRole("button", { name: /^No leídas/ }).click();

    const antes = await pendientes(page);
    test.skip(antes === 0, "sin novedades sin leer en qa-e2e");

    const marcar = page.getByRole("button", { name: "Marcar como leída" }).first();
    const titulo =
      (await marcar.locator("xpath=ancestor::li[1]").getByRole("heading").first().textContent()) ?? "";

    await marcar.click();
    await expect.poll(() => pendientes(page), { timeout: 10_000 }).toBe(antes - 1);
    await expect(page.getByRole("button", { name: "Marcar como leída" })).toHaveCount(antes - 1);
    if (titulo) await expect(page.getByRole("heading", { name: titulo })).toHaveCount(0);
    await capturar(page, info, "novedades-no-leidas-tras-marcar");

    await filtro.getByRole("button", { name: "Todas" }).click();
    if (titulo) {
      const fila = page.getByRole("heading", { name: titulo }).locator("xpath=ancestor::li[1]");
      await expect(fila).toBeVisible();
      await expect(fila.getByText("Nueva", { exact: true })).toHaveCount(0);
      await expect(fila.getByRole("button", { name: "Marcar como leída" })).toHaveCount(0);
    }
    await capturar(page, info, "novedades-todas-tras-marcar");
  });
});