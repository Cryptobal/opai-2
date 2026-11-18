import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-571: marcadores de empresa, cotización y bloques en plantilla HTML (solo simulación en Configuración).
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const HTML = [
  "<section style=\"padding:16px\">",
  "<h1>{{empresa.nombre}} para {{cuenta.nombre}}</h1>",
  "<p>Cotización {{cotizacion.codigo}} · {{cotizacion.titulo}}</p>",
  "{{tabla_servicio}}",
  "{{resumen_economico}}",
  "{{#cada puestos}}<p>{{puesto.nombre}} × {{puesto.cantidad}}</p>{{/cada}}",
  "</section>",
].join("");

test.describe("@preview cpq: marcadores HTML de propuesta (CAR-571)", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("revisar reconoce los marcadores nuevos del catálogo v3", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/cpq?seccion=marca-plantillas");
    const archivo = page.getByLabel("Archivo HTML");
    await archivo.scrollIntoViewIfNeeded();
  await expect(async () => {
      await archivo.setInputFiles({ name: "propuesta-marcadores.html", mimeType: "text/html", buffer: Buffer.from(HTML) });
      await expect(page.getByRole("button", { name: "Revisar HTML" })).toBeEnabled({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await page.getByRole("button", { name: "Revisar HTML" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "No se puede guardar" })).toHaveCount(0);
    const reconocidos = page.getByLabel("Marcadores reconocidos");
    for (const t of ["empresa.nombre", "cuenta.nombre", "cotizacion.codigo", "cotizacion.titulo", "bloque.tabla_servicio", "bloque.resumen_economico", "puesto.nombre", "puesto.cantidad"]) {
      await expect(reconocidos).toContainText(`{{${t}}}`);
    }
    await page.getByTitle("Vista previa del HTML subido").scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-propuesta-html-marcadores-vista");
  });
});