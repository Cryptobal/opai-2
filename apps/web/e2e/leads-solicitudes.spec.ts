import { expect as base, type Page, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Leads PR 1 (BRIEF-07-leads) — bandeja, registro, detalle, derivar y «Pasar a negocio» a 375, 1024 y
// 1280 px, y la pestaña «Canales de entrada» de Configuración → Comercial. Datos ficticios; cada
// proyecto crea su propia solicitud. Capturas en test-results/.
test.use({ actionTimeout: 30_000 });
const expect = base.configure({ timeout: 30_000 });
test.setTimeout(300_000);

const dialogo = (page: Page) => page.getByRole("dialog");

test.describe("Leads · solicitudes", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("registrar, derivar y convertir una solicitud en negocio", async ({ page }, info) => {
    const sufijo = Date.now().toString(36);
    const empresa = `Atlas E2E ${info.project.name} ${sufijo}`;
    const foto = (n: string) => page.screenshot({ path: info.outputPath(`${n}.png`) });
    await entrar(page);
    await page.goto("/solicitudes");
    await expect(page.getByRole("heading", { name: "Solicitudes" }).first()).toBeVisible();
    await foto("bandeja");

    // Registrar (hoja ?nueva=1): entra como «nueva», canal manual.
    await page.getByRole("link", { name: "Registrar solicitud" }).filter({ visible: true }).first().click();
    await expect(dialogo(page).getByText("Registrar solicitud").first()).toBeVisible();
    await dialogo(page).getByLabel("Mensaje").fill("Necesitamos guardias para una bodega en Lampa.");
    await dialogo(page).getByLabel("Empresa").fill(empresa);
    await dialogo(page).getByLabel("Nombre").fill("Ana Pérez");
    await dialogo(page).getByLabel("Correo").fill(`ana-${sufijo}@atlas.example`);
    await foto("hoja-registrar");
    await dialogo(page).getByRole("button", { name: "Registrar solicitud" }).click();
    await page.waitForURL(/\/solicitudes\/[0-9a-f-]{36}/);

    // Detalle: texto original como contenido externo, estado «Nueva», sin enlaces dentro del texto.
    await expect(page.getByText("Contenido externo · texto original, sin formato")).toBeVisible();
    await expect(page.getByText("Necesitamos guardias para una bodega en Lampa.")).toBeVisible();
    await expect(page.getByText("Nueva", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await foto("detalle");

    // Derivar desde «Más acciones».
    await page.getByRole("button", { name: "Más acciones" }).filter({ visible: true }).first().click();
    await page.getByRole("menuitem", { name: "Derivar a revisión" }).click();
    await expect(page.getByText("En revisión", { exact: true }).filter({ visible: true }).first()).toBeVisible();

    // Procesar y convertir: la vista previa dice qué se crea y «Pasar a negocio» lo hace.
    // CAR-209: abrir la hoja es local (sin pedir la página al servidor): un fallo puntual de la
    // base en esa carga ya no puede reemplazar la ficha por un error.
    const paginasPedidas: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "GET" && r.url().includes("_rsc=")) paginasPedidas.push(r.url());
    });
    await page.getByRole("link", { name: "Procesar y convertir" }).filter({ visible: true }).first().click();
    await expect(dialogo(page).getByText("Qué pasa al convertir")).toBeVisible();
    await expect(dialogo(page).getByText("Se crea").first()).toBeVisible();
    expect(paginasPedidas.filter((u) => u.includes("convertir=1"))).toEqual([]);
    await expect(page).toHaveURL(/convertir=1/);
    await foto("hoja-convertir");
    await dialogo(page).getByRole("button", { name: "Pasar a negocio" }).click();
    await expect(dialogo(page).getByText("Solicitud convertida").first()).toBeVisible();
    await foto("convertida");
    await dialogo(page).getByRole("link", { name: /Abrir el negocio/ }).click();
    await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
    await expect(page.getByText(empresa).filter({ visible: true }).first()).toBeVisible();
  });

  test("pasar a cotización desde la ficha convierte y abre la cotización sin error de carga (CAR-209)", async ({ page }, info) => {
    const sufijo = Date.now().toString(36);
    await entrar(page);
    await page.goto("/solicitudes?nueva=1");
    await dialogo(page).getByLabel("Mensaje").fill("Cotizar guardias 24/7 para una planta.");
    await dialogo(page).getByLabel("Empresa").fill(`Planta E2E ${info.project.name} ${sufijo}`);
    await dialogo(page).getByLabel("Nombre").fill("Marta Lagos");
    await dialogo(page).getByLabel("Correo").fill(`marta-${sufijo}@planta.example`);
    await dialogo(page).getByRole("button", { name: "Registrar solicitud" }).click();
    await page.waitForURL(/\/solicitudes\/[0-9a-f-]{36}/);
    const sinError = page.getByText("No pudimos cargar esta información");
    await page.getByRole("link", { name: "Procesar y convertir" }).filter({ visible: true }).first().click();
    await expect(dialogo(page).getByText("Qué pasa al convertir")).toBeVisible();
    await expect(sinError).toHaveCount(0);
    await dialogo(page).getByRole("button", { name: "Pasar a cotización" }).click();
    await expect(dialogo(page).getByText("Cotización creada").first()).toBeVisible();
    await expect(sinError).toHaveCount(0);
    await dialogo(page).getByRole("link", { name: "Abrir la cotización" }).click();
    await page.waitForURL(/\/cotizaciones\/[0-9a-f-]{36}/);
  });

  test("la configuración muestra los canales sin conectar", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/comercial?seccion=canales");
    await expect(page.getByText("Formulario web").first()).toBeVisible();
    await expect(page.getByText("Correo de entrada").first()).toBeVisible();
    await expect(page.getByText("Sin conectar").first()).toBeVisible();
    await page.screenshot({ path: info.outputPath("canales.png") });
  });
});
