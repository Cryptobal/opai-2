import { expect, type Page, test } from "@playwright/test";

import { entrarTrabajador } from "./auditoria/identidades";
import { erroresDeConsola } from "./hilo-apoyo";
import { capturar, pasarProteccionDeVercel } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-335 D6e: el portal del trabajador con el diseño nuevo, con la persona ficticia «Guardia QA» de
// la empresa `qa-e2e` (semilla de CAR-401, la única con usuario de OPAI y acceso a Trabajador). El
// dueño de `qa-e2e` no tiene ese portal, así que con él se vería el aviso «Sin permisos». La piel nueva
// llega desde el servidor y, en el teléfono, la barra de abajo conserva las pestañas del portal.
// Una sola corrida (proyecto desktop) recorre los tres anchos: cada ingreso asigna un PIN temporal a la
// misma persona, y dos proyectos en paralelo se lo pisarían.
const ANCHOS = [
  { nombre: "telefono", width: 375, height: 812, telefono: true },
  { nombre: "ipad", width: 1024, height: 768, telefono: false },
  { nombre: "desktop", width: 1280, height: 860, telefono: false },
];

async function revisarAncho(page: Page, telefono: boolean) {
  const documento = await page.goto("/trabajador");
  expect(await documento?.text()).toContain('data-marco="nuevo"');
  const marco = page.locator('div[data-marco="nuevo"]');
  await expect(marco).toBeVisible({ timeout: 60_000 });
  await expect(marco).toHaveAttribute("data-pestanas", "portal");
  await expect(page.locator('nav[data-shell="inferior-nuevo"]')).toHaveCount(0);
  if (telefono) {
    const barra = page.locator('nav[aria-label="Principal"].fixed');
    await expect(barra).toBeVisible();
    await expect(barra.getByRole("link", { name: "Inicio" })).toBeVisible();
  }
  await expect(page.getByText("No pudimos cargar esta información")).toHaveCount(0);
}

test.describe("@preview portal trabajador con el diseño nuevo", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("piel nueva y pestañas propias del portal", async ({ page, browser }, info) => {
    test.skip(info.project.name !== "desktop", "una sola corrida: el ancho lo fija la prueba");
    test.setTimeout(300_000);
    await entrar(page);
    const ctx = await browser.newContext({
      ...(info.project.use.baseURL ? { baseURL: info.project.use.baseURL } : {}),
      locale: "es-CL",
      timezoneId: "America/Santiago",
    });
    try {
      const trabajador = await ctx.newPage();
      await pasarProteccionDeVercel(trabajador);
      const errores = erroresDeConsola(trabajador);
      expect(await entrarTrabajador(page, trabajador)).toBeNull();
      for (const ancho of ANCHOS) {
        await trabajador.setViewportSize({ width: ancho.width, height: ancho.height });
        await revisarAncho(trabajador, ancho.telefono);
        await capturar(trabajador, info, `trabajador-diseno-nuevo-${ancho.nombre}`);
      }
      expect(errores).toEqual([]);
    } finally {
      await ctx.close();
    }
  });
});
