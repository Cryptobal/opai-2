import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-528 en `preview-e2e`: el owner de la empresa ficticia `qa-e2e` abre «Ver como…», elige Terreno y
// mira el equipo de una instalación con la banda fija; los botones que guardan quedan desactivados y
// «Salir» cierra la vista. Sin instalaciones con equipo en `qa-e2e`, se captura el estado vacío y se anota.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview ver como: Terreno", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("selector, banda fija, solo lectura y salir", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/ver-como?portal=terreno");
    await expect(page.getByRole("search")).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "ver-como-selector");

    const ver = page.getByRole("button", { name: /^Ver como / }).first();
    if ((await ver.count()) === 0) {
      info.annotations.push({ type: "sin-datos", description: "qa-e2e sin equipo de Terreno" });
      expect(errores).toEqual([]);
      return;
    }
    await ver.click();
    const banda = page.getByRole("status").filter({ hasText: "Estás viendo como" });
    await expect(banda).toBeVisible({ timeout: 60_000 });
    await expect(banda).toContainText("Terreno");
    await capturar(page, info, "ver-como-terreno");

    await page.goto("/terreno/rondas");
    await expect(banda).toBeVisible({ timeout: 60_000 });
    const iniciar = page.getByRole("button", { name: "Iniciar" });
    if ((await iniciar.count()) > 0) await expect(iniciar.first()).toBeDisabled();
    await capturar(page, info, "ver-como-terreno-rondas");

    await banda.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("Estás viendo como")).toHaveCount(0, { timeout: 60_000 });
    expect(errores).toEqual([]);
  });
});

test.describe("@preview ver como: Trabajador y Cliente", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  for (const [portal, ruta] of [
    ["trabajador", "/trabajador/mis-datos"],
    ["cliente", "/cliente"],
  ] as const) {
    test(`${portal}: shell de la persona vista y botones que guardan desactivados`, async ({
      page,
    }, info) => {
      await entrar(page);
      await page.goto(`/ver-como?portal=${portal}`);
      await expect(page.getByRole("search")).toBeVisible({ timeout: 60_000 });
      const ver = page.getByRole("button", { name: /^Ver como / }).first();
      if ((await ver.count()) === 0) {
        info.annotations.push({ type: "sin-datos", description: `qa-e2e sin ${portal} para ver` });
        return;
      }
      await ver.click();
      const banda = page.getByRole("status").filter({ hasText: "Estás viendo como" });
      await expect(banda).toBeVisible({ timeout: 60_000 });
      await page.goto(ruta);
      await expect(banda).toBeVisible({ timeout: 60_000 });
      const guardar = page.getByRole("button", { name: "Guardar" });
      if ((await guardar.count()) > 0) await expect(guardar.first()).toBeDisabled();
      await capturar(page, info, `ver-como-${portal}`);
      await banda.getByRole("button", { name: "Salir" }).click();
      await expect(page.getByText("Estás viendo como")).toHaveCount(0, { timeout: 60_000 });
    });
  }
});
