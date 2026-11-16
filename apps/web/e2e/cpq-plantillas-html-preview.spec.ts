import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Plantillas HTML de la propuesta (CAR-532) en `preview-e2e`, a 375, 1024 y 1280 px, con `qa-e2e`.
// Solo revisa (simulación): no guarda ni activa plantillas en la empresa de prueba.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const HTML = [
  '<section style="padding: 16px"><h1 style="color: #1f3a5f">Propuesta para {{cuenta.nombre}}</h1>',
  "<p>{{cuenta.inventado}}</p><script>alert(1)</script></section>",
].join("");

test.describe("@preview cpq: plantillas HTML en Marca y plantillas", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("revisar muestra los errores del saneador y el marcador no reconocido", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/cpq?seccion=marca-plantillas");
    const archivo = page.getByLabel("Archivo HTML");
    await archivo.scrollIntoViewIfNeeded();
    const revisar = page.getByRole("button", { name: "Revisar HTML" });
    // El HTML llega del servidor antes de hidratar: se reintenta hasta que el formulario responda.
    await expect(async () => {
      await archivo.setInputFiles({ name: "propuesta.html", mimeType: "text/html", buffer: Buffer.from(HTML) });
      await expect(revisar).toBeEnabled({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await revisar.click();
    const errores = page.getByRole("alert").filter({ hasText: "No se puede guardar" });
    await expect(errores).toBeVisible();
    await expect(errores).toContainText("cuenta.inventado");
    await expect(page.getByRole("button", { name: "Guardar plantilla HTML" })).toBeDisabled();
    await errores.scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-plantillas-html-errores");
    const limpio = HTML.replace("<p>{{cuenta.inventado}}</p><script>alert(1)</script>", "<p>Servicio de seguridad</p>");
    await archivo.setInputFiles({ name: "propuesta.html", mimeType: "text/html", buffer: Buffer.from(limpio) });
    await revisar.click();
    await expect(page.getByTitle("Vista previa del HTML subido")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar plantilla HTML" })).toBeEnabled();
    await expect(page.getByLabel("Marcadores reconocidos")).toContainText("{{cuenta.nombre}}");
    await page.getByTitle("Vista previa del HTML subido").scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-plantillas-html-vista");
  });
});
