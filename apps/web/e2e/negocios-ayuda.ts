import { expect as base, type Page } from "@playwright/test";

// Ayudas de negocios-car33.spec.ts (CAR-33): localizadores y pasos que se repiten.
const expect = base.configure({ timeout: 30_000 });

export const dialogo = (page: Page) => page.getByRole("dialog");
export const vista = (page: Page) => page.getByRole("group", { name: "Vista de negocios" }).first();
export const columna = (page: Page, etapa: string) =>
  page.getByRole("region", { name: new RegExp(`^${etapa}, \\d+ negocios$`) });
export const cambiarEtapa = (page: Page) =>
  page.getByRole("button", { name: /^Cambiar etapa de / });

/** «Cambiar etapa» de la ficha → etapa. Centra el botón: la barra superior fija tapa el borde. */
export async function moverDesdeFicha(page: Page, etapa: string) {
  await cambiarEtapa(page).evaluate((b) => b.scrollIntoView({ block: "center" }));
  await cambiarEtapa(page).click();
  await page.getByRole("menuitem", { name: etapa }).click();
}

/** Sin scroll horizontal en la página (nada se sale del ancho de la pantalla). */
export async function sinDesborde(page: Page) {
  const [ancho, vista] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(ancho).toBeLessThanOrEqual(vista);
}

/** Crea un negocio en Logística Andina desde la hoja; con instalaciones si se indican. */
export async function crearNegocio(page: Page, titulo: string, instalaciones: string[] = []) {
  await page.goto("/negocios?nuevo=1");
  const crear = dialogo(page).getByRole("button", { name: "Crear negocio" });
  await expect(crear).toBeDisabled();
  await dialogo(page).getByRole("button", { name: "Cuenta" }).click();
  await page.getByRole("combobox").last().fill("Logística");
  await page.getByRole("option", { name: /Logística Andina/ }).click();
  for (const nombre of instalaciones) {
    const campo = dialogo(page).getByRole("button", { name: "Instalaciones" });
    await expect(campo).toBeEnabled();
    await campo.click();
    await page.getByRole("option", { name: nombre }).click();
    await page.keyboard.press("Escape");
  }
  await dialogo(page).getByLabel("Nombre del negocio").fill(titulo);
  await expect(crear).toBeEnabled();
  await crear.click();
  await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
}

/** «Nueva cotización» desde un negocio: un clic antes de hidratar se pierde, así que se repite hasta llegar. */
export async function irANuevaCotizacion(page: Page) {
  const enlace = page.getByRole("link", { name: "Nueva cotización", exact: true });
  await base(async () => {
    if (!/\/cotizaciones\/nueva/.test(page.url())) await enlace.click({ timeout: 3_000 });
    await base(page).toHaveURL(/\/cotizaciones\/nueva/, { timeout: 5_000 });
  }).toPass({ timeout: 40_000 });
}
