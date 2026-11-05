import { expect as base, type Page, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Brief 07 · PR 1b — tablero, hojas y editor del embudo a 375, 1024 y 1280 px: crear un negocio desde
// el tablero, moverlo arrastrando (iPad y escritorio) y con «Mover a…», perder con motivo, reabrir,
// ganar con la casilla sin cotización y editar una etapa del embudo. Capturas en test-results/.
// Usa la cuenta e instalación ficticias de seed:maestros-demo; cada proyecto crea su propio negocio.
test.use({ actionTimeout: 30_000 });
// Las hojas se descargan al abrirse y en desarrollo se compilan la primera vez: más margen.
const expect = base.configure({ timeout: 30_000 });
test.setTimeout(300_000);

const dialogo = (page: Page) => page.getByRole("dialog");
const columna = (page: Page, etapa: string) =>
  page.getByRole("region", { name: new RegExp(`^${etapa}, \\d+ negocios$`) });

/** Badge de estado de la ficha (la lista oculta en el teléfono también dice «abiertos»). */
const estado = (page: Page, texto: string) =>
  page.getByText(texto, { exact: true }).filter({ visible: true }).first();

async function elegir(page: Page, etiqueta: string, opcion: string) {
  await dialogo(page).getByRole("button", { name: etiqueta }).click();
  await page.getByRole("option", { name: opcion }).click();
}

async function moverA(page: Page, titulo: string, etapa: string) {
  await page.getByRole("button", { name: `Mover ${titulo} a…` }).click();
  await page.getByRole("menuitem", { name: etapa }).click();
}

test.describe("Comercial · tablero y hojas", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("crear, mover, perder, reabrir y ganar un negocio", async ({ page }, info) => {
    const titulo = `E2E ${info.project.name} ${Date.now().toString(36)}`;
    const foto = (n: string) => page.screenshot({ path: info.outputPath(`${n}.png`) });
    await entrar(page);
    await page.goto("/negocios");
    await expect(page.getByRole("region", { name: "Tablero de negocios" })).toBeVisible();
    await expect(columna(page, "Prospecto")).toBeAttached();
    await foto("tablero");

    // Nuevo negocio desde el tablero (hoja ?nuevo=1).
    await page
      .getByRole("link", { name: "Nuevo negocio" })
      .filter({ visible: true })
      .first()
      .click();
    await expect(dialogo(page).getByText("Nuevo negocio").first()).toBeVisible();
    await dialogo(page).getByRole("button", { name: "Cuenta" }).click();
    await page.getByRole("combobox").last().fill("Logística");
    await page.getByRole("option", { name: /Logística Andina/ }).click();
    await dialogo(page).getByLabel("Nombre del negocio").fill(titulo);
    await foto("hoja-nuevo");
    await dialogo(page).getByRole("button", { name: "Crear negocio" }).click();
    await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
    const ficha = new URL(page.url()).pathname;

    // Vincular una instalación (R10) desde la ficha.
    await page.getByRole("link", { name: "Vincular" }).first().click();
    await elegir(page, "Agregar instalación", "Planta Quilicura");
    await dialogo(page).getByRole("button", { name: "Vincular instalación" }).click();
    await expect(dialogo(page).getByText("Planta Quilicura")).toBeVisible();
    await dialogo(page).getByRole("button", { name: "Listo" }).click();

    // Mover: arrastrando en iPad y escritorio; con «Mover a…» en el teléfono.
    await page.goto("/negocios");
    const tarjeta = page.getByRole("article", { name: titulo });
    if (info.project.name === "telefono") await moverA(page, titulo, "Calificado");
    else await tarjeta.dragTo(columna(page, "Calificado"));
    await expect(columna(page, "Calificado").getByRole("article", { name: titulo })).toBeAttached();
    await foto("tablero-movido");

    // «Mover a…» a una etapa que pide monto: abre la hoja Mover con lo que falta (R9).
    await moverA(page, titulo, "Visita técnica");
    await dialogo(page).getByLabel("Valor mensual estimado").fill("2500000");
    await foto("hoja-mover");
    await dialogo(page).getByRole("button", { name: "Mover", exact: true }).click();
    await expect(
      columna(page, "Visita técnica").getByRole("article", { name: titulo }),
    ).toBeAttached();

    // Perder con motivo (soltar o «Mover a…» en la perdida abre la hoja Perder).
    await moverA(page, titulo, "Perdido (perder)");
    await elegir(page, "Motivo de pérdida", "Precio");
    await foto("hoja-perder");
    await dialogo(page).getByRole("button", { name: "Perder negocio" }).click();
    await expect(columna(page, "Perdido").getByRole("article", { name: titulo })).toBeAttached();

    // Reabrir desde la ficha, en la etapa en que estaba.
    await page.goto(ficha);
    await page.getByRole("link", { name: "Reabrir" }).click();
    await dialogo(page).getByLabel("Por qué se reabre").fill("Pidieron una nueva propuesta");
    await foto("hoja-reabrir");
    await dialogo(page).getByRole("button", { name: "Reabrir" }).click();
    await expect(estado(page, "Abierto")).toBeVisible();

    // Ganar sin cotización: inicio del servicio y la casilla obligatoria.
    await page.getByRole("link", { name: "Ganar" }).click();
    await dialogo(page).getByLabel("Inicio del servicio").fill("01-12-2026");
    const ganar = dialogo(page).getByRole("button", { name: "Ganar negocio" });
    await expect(ganar).toBeDisabled();
    await dialogo(page).getByText("Entiendo que gano este negocio sin cotización").click();
    await foto("hoja-ganar");
    await ganar.click();
    await expect(estado(page, "Ganado")).toBeVisible();
    await foto("ficha-ganado");
  });

  test("editar una etapa del embudo", async ({ page }, info) => {
    await entrar(page);
    // Configuración del módulo abre en «Importar 1.0»; el embudo es la sección `embudo`.
    await page.goto("/configuracion/modulo/comercial?seccion=embudo");
    const fila = page.getByRole("listitem", { name: "Calificado" });
    await expect(fila).toBeVisible();
    await page.screenshot({ path: info.outputPath("config-embudo.png"), fullPage: true });
    const editar = async (prob: string) => {
      // Reintenta el clic si llega antes de hidratar (servidor de desarrollo compilando).
      await expect(async () => {
        await fila.getByRole("button", { name: "Editar" }).click();
        await expect(dialogo(page)).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 60_000 });
      await dialogo(page).getByLabel("Probabilidad (%)").fill(prob);
      await dialogo(page).getByRole("button", { name: "Guardar" }).click();
      await expect(fila.getByText(`${prob} %`)).toBeVisible();
    };
    await editar("25");
    await editar("20");
    await page.getByRole("link", { name: "Catálogos" }).click();
    await expect(page.getByText("Motivos de pérdida")).toBeVisible();
    await page.screenshot({ path: info.outputPath("config-catalogos.png"), fullPage: true });
  });
});
