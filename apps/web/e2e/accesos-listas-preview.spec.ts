import { expect, type Page, test } from "@playwright/test";

import { capturar, capturarHoja, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-475: listas autorizada y bloqueada (`/accesos/listas`) y pestaña Accesos de la instalación.
// En la vista previa solo se abre la hoja: agregar exige ACCESO_HUELLA_SECRET (CAR-483), que allí no existe.
/** RUN válido al azar (dígito verificador módulo 11), para no chocar con «ya está en la lista». */
function runAlAzar(): string {
  const cuerpo = 10_000_000 + Math.floor(Math.random() * 9_000_000);
  let suma = 0;
  let factor = 2;
  for (const d of String(cuerpo).split("").reverse()) {
    suma += Number(d) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (suma % 11);
  return `${cuerpo}-${dv === 11 ? "0" : dv === 10 ? "K" : String(dv)}`;
}

async function entrarNuevo(page: Page) {
  await entrar(page);
  await page
    .context()
    .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
}

test.describe("@preview acceso: listas y pestaña de la instalación", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("listas: autorizadas, bloqueadas y hoja de agregar", async ({ page }, info) => {
    await entrarNuevo(page);
    await page.goto("/accesos/listas");
    const agregar = page.getByRole("button", { name: "Agregar" }).filter({ visible: true }).first();
    await expect(agregar).toBeVisible({ timeout: 60_000 });
    await capturar(page, info, "accesos-listas-autorizadas");

    // El botón responde recién hidratado: se reintenta el clic hasta que la hoja se abre.
    await expect(async () => {
      await agregar.click();
      await expect(page.getByRole("dialog").getByText("Agregar a autorizados")).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 60_000 });
    await capturarHoja(page, info, "accesos-listas-hoja");
    if (!EN_PREVIEW) {
      const hoja = page.getByRole("dialog");
      const nombre = `Visita E2E ${Date.now() % 100_000}`;
      await hoja.getByLabel("Nombre").fill(nombre);
      await hoja.getByLabel("Número").fill(runAlAzar());
      await hoja.getByRole("button", { name: "Agregar", exact: true }).click();
      await expect(page.getByText(nombre).filter({ visible: true }).first()).toBeVisible({
        timeout: 30_000,
      });
    }
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Bloqueadas" }).first().click();
    await expect(page).toHaveURL(/lista=bloqueada/, { timeout: 60_000 });
    await capturar(page, info, "accesos-listas-bloqueadas");
  });

  test("ficha de instalación: pestaña Accesos", async ({ page }, info) => {
    await entrarNuevo(page);
    await page.goto("/instalaciones");
    const fila = page
      .locator('a[href^="/instalaciones/0"]') // ids uuid v7; deja fuera «/instalaciones/nueva»
      .filter({ visible: true })
      .first();
    await expect(fila).toBeVisible({ timeout: 60_000 });
    await fila.click();
    const pestana = page
      .locator('a[href^="/instalaciones/"][href*="/accesos"]')
      .filter({ visible: true })
      .first();
    await expect(pestana).toBeVisible({ timeout: 60_000 });
    await pestana.click();
    await expect(page).toHaveURL(/\/instalaciones\/[^/]+\/accesos/, { timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Listas" }).first()).toBeVisible();
    await capturar(page, info, "instalacion-accesos");
  });
});
