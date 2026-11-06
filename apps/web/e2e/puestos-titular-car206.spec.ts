import { execFileSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

import { urlSiembra } from "./fixtures-puestos-car8";
import { hidratado } from "./hidratacion";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-206: asignar titular desde la ficha del puesto. Flujo completo en iPad (escritura una vez):
// crear puesto → asignar titular (con vista previa) → la pauta del mes se pinta desde «Rige desde» →
// historial en la ficha → quitar titular. Instalación y guardia: `seed:pauta-e2e` (Planta Titular E2E).
// En 375 y 1280 solo se comprueba que la ficha y la hoja de asignar no desbordan.
const INST = "00000000-0000-7000-8000-0000000b0020";
const HOY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const NOMBRE = `Titular E2E ${Date.now().toString(36)}`;

const GUARDIA = "00000000-0000-7000-8000-0000000b0021";

/** Deja al guardia libre (sin series ni puesto en su vínculo): un reintento o una corrida repetida parte limpio. */
function liberarGuardia() {
  const sql = `SELECT set_config('app.tenant_id', (SELECT id::text FROM core.tenants WHERE slug = 'gard'), false);
    DELETE FROM pauta.series WHERE titular_persona_id = '${GUARDIA}';
    UPDATE core.vinculos_laborales SET puesto_id = NULL WHERE persona_id = '${GUARDIA}';`;
  execFileSync("psql", [urlSiembra, "-X", "-q", "-c", sql]);
}

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}
const sinDesborde = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

test.describe("puestos · asignar titular (CAR-206)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("crea el puesto, asigna titular, la pauta se pinta, queda en el historial y se quita", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    liberarGuardia();
    await entrar(page);
    await page.goto(`/instalaciones/${INST}/puestos?puesto=nuevo`);
    const crear = page.getByRole("button", { name: "Crear puesto" });
    await hidratado(crear);
    await page.locator("#p-nombre").fill(NOMBRE);
    await page.locator("#p-cargo").click();
    await page.getByRole("option", { name: "Guardia Pauta E2E" }).click();
    await page.locator("#p-patron").click();
    await page.getByRole("option", { name: /^4×4/ }).first().click();
    await crear.click();
    await expect(page.getByText(`Puesto ${NOMBRE} creado`)).toBeVisible();

    // Ficha: sin titular, PPC; asignar.
    await page.getByRole("link", { name: new RegExp(NOMBRE) }).filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { name: "Titular", exact: true })).toBeVisible();
    await expect(page.getByText("Sin titular · puesto por cubrir")).toBeVisible();
    await page.getByRole("button", { name: "Asignar titular" }).click();
    const asignar = page.getByRole("button", { name: "Asignar titular" });
    await expect(page.getByRole("dialog", { name: new RegExp(`Asignar titular · ${NOMBRE}`) })).toBeVisible();
    await hidratado(asignar);
    await expect(asignar).toBeDisabled();
    await page.locator("#t-guardia").click();
    await page.getByRole("option", { name: "Titular E2E" }).click();
    await expect(page.getByText("Vista previa")).toBeVisible();
    await expect(page.getByText("El puesto no tenía titular: no se cierra ninguna serie.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Primeros 14 días de la serie nueva" })).toBeVisible();
    expect(await sinDesborde(page)).toBe(true);
    await captura(page, "puestos-asignar-titular", info.project.name);
    await asignar.click();
    await expect(page.getByText("Titular asignado")).toBeVisible();

    // La pauta del mes: el titular, y hoy el turno cubierto (4×4 desde «Rige desde» = hoy).
    await page.goto(`/pauta?inst=${INST}`);
    await expect(page.getByText("Titular E2E").first()).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`${NOMBRE}, ${HOY}: Cubierto`) })).toBeVisible();

    // Historial en la ficha.
    await page.goto(`/instalaciones/${INST}/puestos`);
    const fila = page.getByRole("link", { name: new RegExp(NOMBRE) }).filter({ visible: true }).first();
    await hidratado(fila);
    await fila.click();
    await expect(page.getByText("Historial de titulares")).toBeVisible();
    await expect(page.getByText(/asignó a Titular E2E/)).toBeVisible();
    await captura(page, "puestos-ficha-titular", info.project.name);

    // Quitar titular desde hoy: el puesto vuelve a PPC.
    await page.getByRole("button", { name: "Quitar titular" }).click();
    const quitar = page.getByRole("button", { name: "Quitar titular" });
    await expect(page.getByText("El puesto quedará por cubrir")).toBeVisible();
    await hidratado(quitar);
    await quitar.click();
    await expect(page.getByText("Titular quitado: el puesto quedó por cubrir")).toBeVisible();
    await page.goto(`/pauta?inst=${INST}&ver=ppc`);
    await expect(page.getByText(NOMBRE).first()).toBeVisible();
  });

  test("la ficha del puesto y la hoja de asignar no desbordan", async ({ page }) => {
    await entrar(page);
    await page.goto(`/instalaciones/${INST}/puestos`);
    expect(await sinDesborde(page)).toBe(true);
  });
});
