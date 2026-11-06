import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

import { entrar } from "./sesion";
import { sinDesborde, irANuevaCotizacion } from "./negocios-ayuda";

// CAR-162: primera cotización en un tenant sin mutual confirmada (el seed e2e no la siembra).
const numeros: Record<string, number> = { telefono: 1, ipad: 2, desktop: 3 };
test.setTimeout(180_000);
test.beforeAll(() => {
  execFileSync("pnpm", ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-cpq-e2e.ts"], {
    cwd: new URL("../../..", import.meta.url),
    env: process.env,
    stdio: "inherit",
  });
});

const visible = (page: Page, nombre: string) =>
  page.getByRole("button", { name: nombre }).filter({ visible: true }).first();

async function sinEnlacesRotos(page: Page) {
  const hrefs = await page.locator("main a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  for (const h of hrefs) {
    expect(h).not.toContain("/configuracion/grupo/operacion/remuneraciones");
    expect(h).not.toContain("/configuracion/grupo/remuneraciones");
    expect(h).not.toContain("/personas/cargos");
  }
}

test("tenant vacío: de la cotización nueva al costo calculado y la vista previa", async ({ page }, info) => {
  const numero = numeros[info.project.name] ?? 1;
  await entrar(page, "cpq-costos@example.test");
  await page.goto(`/negocios/00000000-0000-7000-8000-00000000132${numero}`);
  await irANuevaCotizacion(page);
  await page.getByLabel("Título", { exact: true }).fill(`Tenant vacío ${info.project.name} ${Date.now()}`);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
  const ficha = page.url();

  // Sin cálculo: margen «—», sin semáforo rojo ni «0,0 %».
  await expect(page.getByText("Margen contra el objetivo").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Bajo el mínimo")).toHaveCount(0);
  await expect(page.getByText(/^0[.,]0 %$/)).toHaveCount(0);

  // Puesto sin sueldo: el aviso nombra la causa y su acción abre la hoja, sin navegar.
  await visible(page, "Agregar puesto").click();
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  // El primer guardado del puesto y su cálculo compilan sus rutas en frío en el runner: primero se espera
  // a que la hoja cierre y después al aviso.
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 60_000 });
  await expect(page.getByText(/Falta el sueldo base de «Guardia»/).filter({ visible: true })).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Ingresar sueldo" }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText("Ver cargos")).toHaveCount(0);
  await sinEnlacesRotos(page);
  await visible(page, "Ingresar sueldo").click();
  await expect(page.getByRole("dialog", { name: "Editar puesto" })).toBeVisible();
  expect(page.url()).toBe(ficha);
  await sinDesborde(page);
  await page.screenshot({ path: info.outputPath("cpq-tenant-vacio-hoja.png"), fullPage: true });

  // Con sueldo: costo y venta calculados, con el aviso de la mutual supuesta y su confirmación.
  await page.getByLabel("Sueldo base (CLP)").fill("650000");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/Falta el sueldo base/).filter({ visible: true })).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(page.getByText(/^Costo empresa: \$/).first()).toBeAttached();
  await expect(page.getByText(/Mutual adicional sin confirmar/).filter({ visible: true }).first()).toBeVisible();
  const confirmar = page.getByRole("link", { name: "Confirmar mutual" }).filter({ visible: true }).first();
  await expect(confirmar).toHaveAttribute("href", "/configuracion/remuneraciones?mutual=1");
  await expect(page.getByRole("button", { name: "Enviar al contacto" })).toHaveCount(0);
  await sinEnlacesRotos(page);
  await page.screenshot({ path: info.outputPath("cpq-tenant-vacio-calculado.png"), fullPage: true });

  // Vista previa del PDF: termina en menos de 20 s con el documento o con un error y «Reintentar».
  // Con puntero táctil (teléfono) el visor ofrece «Abrir PDF» en vez del iframe (CAR-192).
  const pdf = page
    .locator('iframe[title="Vista previa PDF"]')
    .or(page.getByRole("button", { name: "Abrir PDF" }));
  const error = page.getByText("No se pudo mostrar la vista previa");
  const generando = page.getByText("Generando PDF…");
  const abrirVistaPrevia = async () => {
    // «Vista previa PDF» vive en el menú «Más acciones» en todos los anchos.
    await page.getByRole("button", { name: "Más acciones de la cotización" }).click();
    await page.getByRole("menuitem", { name: "Vista previa PDF" }).click();
  };
  // Un clic antes de hidratar se pierde y el diálogo no se abre: se reintenta hasta verlo abierto.
  await expect(async () => {
    if (!(await generando.or(pdf).or(error).first().isVisible())) await abrirVistaPrevia();
    await expect(generando.or(pdf).or(error).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
  // La primera generación del PDF compila su ruta en `next dev` y en el runner tarda más de 21 s.
  await expect(pdf.or(error)).toBeVisible({ timeout: 60_000 });
  if (await error.isVisible()) await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(page.getByText("Generando PDF…")).toHaveCount(0);
});
