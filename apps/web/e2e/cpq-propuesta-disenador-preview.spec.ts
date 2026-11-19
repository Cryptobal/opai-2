import { expect, test, type Page } from "@playwright/test";

import { capturar } from "./preview";
import { abrirDisenadorDePropuesta, capturarPdfs, textoDelUltimoPdf } from "./propuesta-ayuda";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-575: el documento del diseñador es el mismo PDF que se envía, con membrete y con 3 o más secciones con texto
// (resumen, condiciones y contacto), en el orden del armador. Con `qa-e2e`: las condiciones por defecto son un texto de
// prueba, siempre el mismo (así las tres vistas pueden correr a la vez).
test.use({ actionTimeout: 30_000 });
test.setTimeout(300_000);

const CONDICIONES = "Pago a 30 días desde la factura (texto de prueba qa-e2e).";

async function fijarCondiciones(page: Page, texto: string) {
  await page.goto("/configuracion/modulo/cpq?seccion=marca-plantillas");
  const campo = page.getByLabel("Condiciones comerciales por defecto");
  await expect(async () => {
    await campo.fill(texto);
    await page.getByRole("button", { name: "Guardar marca documental" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(campo).toHaveValue(texto, { timeout: 5_000 });
  }).toPass({ timeout: 120_000 });
}

test.describe("@preview cpq: documento del diseñador de la propuesta", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el documento trae membrete y tres secciones con texto, en orden", async ({
    page,
  }, info) => {
    await capturarPdfs(page);
    await entrar(page);
    await fijarCondiciones(page, CONDICIONES);
    await abrirDisenadorDePropuesta(
      page,
      `Diseñador ${info.project.name} ${Date.now()}`,
      "Propuesta del diseñador",
    );
    const documento = page.getByRole("region", { name: "Documento de la propuesta" });
    await expect(documento).toBeVisible({ timeout: 60_000 });
    const texto = await textoDelUltimoPdf(page);
    expect(texto).toContain("PROPUESTA TÉCNICA");
    // Otras pruebas pueden dar texto tipo a más secciones de `qa-e2e`: se mira el orden, no el número.
    const orden = ["Resumen económico", "Condiciones comerciales", "Su ejecutivo comercial"].map((t) =>
      texto.search(new RegExp(`\\d+\\. ${t}`)),
    );
    expect(orden.every((i) => i > 0)).toBe(true);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
    expect(texto).toContain(CONDICIONES);
    await documento.scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-propuesta-disenador");
  });
});
