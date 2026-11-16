import { expect, type Page, test } from "@playwright/test";

import { erroresDeConsola } from "./hilo-apoyo";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-335 D6e: el portal del trabajador con el diseño nuevo. En `preview-e2e` entra con la sesión del
// owner de `qa-e2e` (como el resto de pruebas del portal), sin asignar PIN ni tocar fichas.
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

  test("piel nueva y pestañas propias del portal", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "una sola corrida: el ancho lo fija la prueba");
    test.setTimeout(300_000);
    const errores = erroresDeConsola(page);
    await entrar(page);
    const sinPortal = page.getByText(
      /Portal no disponible en tu empresa|No tienes acceso a este portal|Tu cuenta aún no tiene una ficha/,
    );
    await page.goto("/trabajador");
    if (await sinPortal.count()) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin portal trabajador" });
      expect(errores).toEqual([]);
      return;
    }
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho.width, height: ancho.height });
      await revisarAncho(page, ancho.telefono);
      await capturar(page, info, `trabajador-diseno-nuevo-${ancho.nombre}`);
    }
    expect(errores).toEqual([]);
  });
});