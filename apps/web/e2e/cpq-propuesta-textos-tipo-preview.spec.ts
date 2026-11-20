import { expect, test, type Page } from "@playwright/test";

import { capturar } from "./preview";
import { abrirDisenadorDePropuesta, capturarPdfs, textoDelUltimoPdf } from "./propuesta-ayuda";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-576: el texto tipo de la empresa se define una vez en Configuración y la propuesta nueva lo trae; en el
// diseñador cada sección se edita en el mismo lugar y puede haber más de un «Texto libre». Con `qa-e2e`: el texto tipo
// es siempre el mismo (así las tres vistas pueden correr a la vez).
test.use({ actionTimeout: 30_000 });
test.setTimeout(300_000);

const TEXTO_TIPO = "Conocemos su operación y sus turnos (texto tipo de prueba qa-e2e).";

async function fijarTextoTipo(page: Page) {
  await page.goto("/configuracion/modulo/cpq?seccion=marca-plantillas");
  const campo = page.locator("#texto-tipo-comprension_servicio");
  await expect(async () => {
    await campo.fill(`${TEXTO_TIPO} `);
    await campo.fill(TEXTO_TIPO);
    await campo.blur();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(campo).toHaveValue(TEXTO_TIPO, { timeout: 5_000 });
  }).toPass({ timeout: 120_000 });
}

async function agregarTextoLibre(page: Page) {
  await page.getByLabel("Bloque para agregar").click();
  await page.getByRole("option", { name: "Información adicional" }).click();
  await page.getByRole("button", { name: "Agregar bloque" }).click();
}

test.describe("@preview cpq: textos de la propuesta", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el texto tipo llega precargado y cada sección se edita en el mismo lugar", async ({ page }, info) => {
    await capturarPdfs(page);
    await entrar(page);
    await fijarTextoTipo(page);
    await abrirDisenadorDePropuesta(page, `Textos ${info.project.name} ${Date.now()}`, "Propuesta con textos");

    const comprension = page.getByLabel("Texto de Comprensión del servicio");
    await expect(comprension).toHaveValue(TEXTO_TIPO, { timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Redactar con IA" }).first()).toBeVisible();

    const propio = `Texto propio de esta cotización (${info.project.name}).`;
    await comprension.fill(propio);
    await comprension.blur();
    await expect(page.getByText("«Comprensión del servicio» guardada")).toBeVisible();
    await expect.poll(async () => textoDelUltimoPdf(page, 2), { timeout: 90_000 }).toContain(propio);

    await agregarTextoLibre(page);
    await expect(page.getByRole("group", { name: "Información adicional" })).toHaveCount(1);
    await agregarTextoLibre(page);
    await expect(page.getByRole("group", { name: "Información adicional" })).toHaveCount(2);
    const titulo = page.getByLabel("Título de Información adicional").last();
    await titulo.fill("Alcance qa-e2e");
    await titulo.blur();
    await expect(page.getByRole("group", { name: "Alcance qa-e2e" })).toBeVisible();

    await page.getByRole("group", { name: "Textos de la propuesta" }).scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-propuesta-textos-tipo");
  });
});
