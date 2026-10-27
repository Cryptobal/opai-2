import { expect, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pulido post-#25 (QA 24-oct): la fila de Personas muestra «cargo · RUT» sin el tipo de contrato (va solo
// en la ficha), en celular también, sin pasar los 64 px de alto y sin cortar nunca el RUT (se acorta el cargo).
const CONTRATO = /Indefinido|Plazo fijo|Por obra|Honorarios|Part[ -]?time|Reemplazo|Temporal/i;
const RUT = /^· \d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;

test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("Personas · fila de la lista", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("cargo y RUT completos, sin tipo de contrato, en 64 px", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/personas");
    const lista = page.getByRole("region", { name: "Lista de personas" });
    const filas = lista.locator('a[href^="/personas/"]:not([href*="vencimientos"])');
    await expect(filas.first()).toBeVisible();
    const total = Math.min(await filas.count(), 8);
    expect(total, "hay personas de demostración").toBeGreaterThan(0);
    for (let i = 0; i < total; i++) {
      const fila = filas.nth(i);
      const texto = await fila.innerText();
      expect(texto, `fila ${i + 1} sin tipo de contrato`).not.toMatch(CONTRATO);
      const rut = fila.locator(".t-mono").first();
      await expect(rut, `fila ${i + 1} muestra el RUT`).toBeVisible();
      expect((await rut.innerText()).trim()).toMatch(RUT);
      // El RUT cabe entero dentro de la fila (el cargo cede antes).
      const celda = await fila.boundingBox();
      const caja = await rut.boundingBox();
      expect(caja && celda && caja.x + caja.width <= celda.x + celda.width + 0.5).toBe(true);
      expect(await rut.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      if (info.project.name === "telefono") {
        expect((await fila.boundingBox())?.height ?? 99).toBeLessThanOrEqual(64.5);
      }
    }
  });
});
