import { expect, type Page, test } from "@playwright/test";
import { hidratado } from "./hidratacion";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Configuración (Brief 02, sesión C): Integraciones, Comunicaciones (con su editor de plantilla),
// Consumos y Auditoría, a 375, 1024 y 1280.

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("configuración de plataforma del tenant", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("integraciones, comunicaciones, consumos y auditoría", async ({ page }, info) => {
    const p = info.project.name;
    await entrar(page);
    const visible = (texto: string | RegExp) =>
      page.getByText(texto).filter({ visible: true }).first();

    await page.goto("/configuracion/integraciones");
    await expect(visible("Geolocalización")).toBeVisible();
    await captura(page, "config-integraciones", p);
    await page.goto("/configuracion/integraciones/ia");
    await expect(visible("Credenciales")).toBeVisible();
    await captura(page, "config-integracion-ia", p);

    await page.goto("/configuracion/comunicaciones");
    await expect(visible("Documento por vencer")).toBeVisible();
    await captura(page, "config-comunicaciones", p);
    await page.goto("/configuracion/comunicaciones/core.documento.por_vencer");
    await expect(visible("Vista previa")).toBeVisible();
    // La vista previa se arma en el cliente (iframe srcdoc): en dev puede tardar más de 5 s.
    await expect(
      page.frameLocator('iframe[title="Vista previa del correo"]').locator("body"),
    ).toContainText(/vence/, { timeout: 30_000 });
    await captura(page, "config-plantilla", p);

    await page.goto("/configuracion/consumos");
    await expect(visible("Llamadas API y MCP")).toBeVisible();
    await captura(page, "config-consumos", p);

    await page.goto("/configuracion/auditoria");
    await expect(visible("Capacidad")).toBeVisible();
    await captura(page, "config-auditoria", p);
  });

  test("activar un aviso y publicar una plantilla", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await page.goto("/configuracion/comunicaciones");
    const sw = page.getByRole("switch", { name: "Activar Documento vencido" });
    await hidratado(sw);
    const antes = await sw.getAttribute("aria-checked");
    await sw.click();
    await expect(sw).not.toHaveAttribute("aria-checked", antes ?? "");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", antes ?? "false");

    await page.goto("/configuracion/comunicaciones/core.documento.vencido");
    const cuerpo = page.getByLabel("Cuerpo");
    await hidratado(cuerpo);
    await cuerpo.fill(`Prueba E2E ${Date.now()}: {{documento.tipo}} venció.`);
    await page.getByRole("button", { name: /Publicar versión/ }).click();
    // El mismo mensaje también aparece en el toast; comprobar el estado persistente del formulario.
    await expect(page.locator("#form-plantilla").getByText(/Versión \d+ publicada/)).toBeVisible();
    await page.getByRole("button", { name: "Volver a la de OPAI" }).click();
    await expect(page.getByText("Se usa otra vez la plantilla de OPAI")).toBeVisible();
  });
});
