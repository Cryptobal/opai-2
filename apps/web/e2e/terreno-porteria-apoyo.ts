import { expect, type Page } from "@playwright/test";
import { digitoVerificador } from "@opai/domain";

/**
 * E4d · Portería de punta a punta: registra una entrada (RUN con dígito verificador), la ve en «En sitio» cuando
 * el servidor la recibe y registra su salida. Devuelve false si Control de acceso no está activo en la empresa.
 * Con capturas de la pantalla a 375 y 1280 px, en claro y oscuro.
 */
export async function porteriaEntradaYSalida(t: Page): Promise<boolean> {
  await t.goto("/terreno/porteria");
  const inactivo = t.getByText("Control de acceso no está activo");
  const formulario = t.getByRole("region", { name: "Registrar entrada" });
  await expect(formulario.or(inactivo)).toBeVisible({ timeout: 30_000 });
  if (await inactivo.isVisible()) return false;

  const cuerpo = String(14_000_000 + (Date.now() % 9_000_000));
  const nombre = `Visita Prueba ${Date.now()}`;
  await formulario.getByLabel("Número de documento").fill(`${cuerpo}-${digitoVerificador(cuerpo)}`);
  await formulario.getByLabel("Nombre y apellidos").fill(nombre);
  await formulario.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(formulario.getByText("Entrada guardada en el teléfono")).toBeVisible();

  const enSitio = t.getByRole("region", { name: "En sitio" });
  const fila = enSitio.getByRole("listitem").filter({ hasText: nombre });
  await expect(async () => {
    await t.reload();
    await expect(fila).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  await expect(fila).not.toContainText(cuerpo);

  for (const [ancho, alto] of [
    [375, 812],
    [1280, 800],
  ] as const) {
    for (const tema of ["light", "dark"] as const) {
      await t.setViewportSize({ width: ancho, height: alto });
      await t.emulateMedia({ colorScheme: tema });
      // Las transiciones de color duran 150-200 ms: la captura espera a que el tema termine de aplicarse.
      await t.waitForTimeout(400);
      await t.screenshot({
        path: `e2e/__screenshots__/terreno-porteria-${ancho}-${tema}.png`,
        fullPage: true,
      });
    }
  }
  await t.setViewportSize({ width: 375, height: 812 });
  await t.emulateMedia({ colorScheme: "light" });

  await fila.getByRole("button", { name: "Registrar salida" }).click();
  await expect(fila.getByText("Salida guardada")).toBeVisible();
  await expect(async () => {
    await t.reload();
    await expect(t.getByRole("region", { name: "En sitio" })).toBeVisible({ timeout: 3_000 });
    await expect(fila).toHaveCount(0);
  }).toPass({ timeout: 60_000 });
  return true;
}
