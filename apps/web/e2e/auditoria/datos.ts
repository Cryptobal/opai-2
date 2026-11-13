import { type Page } from "@playwright/test";

import { digitoVerificador } from "@opai/domain";

// Datos ficticios para que la auditoría pueda abrir fichas y entrar a Guardia y Terreno (CAR-372).
// Los crea el dueño de `qa-e2e` desde la pantalla, en la rama de Neon de la vista previa (se descarta
// con el PR). Nunca Gard ni datos reales. Cada dato se busca antes y solo se crea el que falta.

export const CUENTA_QA = "Cuenta QA auditoría";
const INSTALACION_QA = "Instalación QA auditoría";
const NEGOCIO_QA = "Negocio QA auditoría";

/** RUT válido y único por corrida (cuerpo de 8 dígitos desde la hora). */
function rutNuevo() {
  const cuerpo = String(20_000_000 + (Date.now() % 9_000_000));
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
}

/** Id del primer enlace de la lista que calza con el nombre, o "" si no hay. */
async function buscar(page: Page, ruta: string, q: string, nombre: RegExp): Promise<string> {
  await page.goto(`/${ruta}?q=${encodeURIComponent(q)}`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  const enlace = page.locator(`a[href^="/${ruta}/"]`).filter({ hasText: nombre }).first();
  if ((await enlace.count()) === 0) return "";
  const href = (await enlace.getAttribute("href")) ?? "";
  return href.split("/")[2] ?? "";
}

async function crearCuenta(page: Page): Promise<string> {
  await page.goto("/cuentas?nueva=1");
  const hoja = page.getByRole("dialog", { name: "Nueva cuenta" });
  await hoja.getByRole("group", { name: "Identificación" }).getByLabel("Nombre").fill(CUENTA_QA);
  await hoja.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

async function crearInstalacion(page: Page, cuentaId: string) {
  await page.goto(`/instalaciones/nueva?cuenta=${cuentaId}`);
  await page.getByLabel("Nombre", { exact: true }).fill(INSTALACION_QA);
  const crear = page.getByRole("button", { name: "Crear instalación", exact: true });
  // Si el botón sigue deshabilitado, la nota dice qué pide la pantalla («Falta …»).
  if (await crear.isDisabled().catch(() => false)) {
    const falta = await page.getByText(/^Falta /).first().textContent().catch(() => null);
    throw new Error(`«Crear instalación» deshabilitado: ${falta ?? "sin aviso de lo que falta"}`);
  }
  await crear.click();
  await page.waitForURL(/\/instalaciones\/[0-9a-f-]{36}$/, { timeout: 60_000 });
}

async function crearPersona(page: Page) {
  await page.goto("/personas?nueva=1");
  const hoja = page.getByRole("dialog", { name: "Agregar persona" });
  await hoja.waitFor({ timeout: 60_000 });
  await hoja.getByLabel("Nombres").fill("Persona QA");
  await hoja.getByLabel("Apellidos").fill("Auditoría");
  await hoja.getByLabel("RUT").fill(rutNuevo());
  await hoja.getByLabel("Cargo").click();
  await page.getByRole("option").first().click();
  await hoja.getByRole("button", { name: "Instalación obligatoria" }).click();
  await page
    .getByRole("option", { name: new RegExp(INSTALACION_QA) })
    .first()
    .click();
  await hoja.getByLabel("Horas semanales").fill("45");
  await hoja.getByLabel("Distribución").fill("Lunes a sábado");
  await hoja.getByRole("button", { name: "Crear persona" }).click();
  await page.waitForURL(/\/personas\/[0-9a-f-]{36}$/, { timeout: 60_000 });
}

async function crearNegocio(page: Page, cuentaId: string): Promise<string> {
  await page.goto(`/negocios?nuevo=1&cuenta=${cuentaId}`);
  const hoja = page.getByRole("dialog", { name: "Nuevo negocio" });
  await hoja.waitFor({ timeout: 60_000 });
  await hoja.getByLabel("Nombre del negocio").fill(NEGOCIO_QA);
  await hoja.getByRole("button", { name: "Crear negocio", exact: true }).click();
  await page.waitForURL(/\/negocios\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

async function crearCotizacion(page: Page, negocioId: string) {
  await page.goto(`/cotizaciones/nueva?negocio=${negocioId}`);
  await page.getByLabel("Título").fill("Cotización QA auditoría");
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/[0-9a-f-]{36}/, { timeout: 60_000 });
}

/** Crea la cuenta, la instalación, la persona, el negocio y la cotización que falten; devuelve notas de lo que no se pudo. */
export async function prepararDatos(page: Page): Promise<string[]> {
  const notas: string[] = [];
  // Cada acción falla a los 45 s: un paso colgado deja su nota y no se come el tope de la prueba.
  page.setDefaultTimeout(45_000);
  const paso = async (nombre: string, f: () => Promise<unknown>) => {
    console.log(`datos de auditoría: creando ${nombre}…`);
    return f().then(
      () => (console.log(`datos de auditoría: ${nombre} lista`), true),
      (e: unknown) => (notas.push(`${nombre}: ${String(e).slice(0, 160)}`), false),
    );
  };
  let cuentaId = await buscar(page, "cuentas", CUENTA_QA, new RegExp(CUENTA_QA));
  if (!cuentaId && !(await paso("cuenta", async () => (cuentaId = await crearCuenta(page)))))
    return notas;
  const instalacion = await buscar(
    page,
    "instalaciones",
    INSTALACION_QA,
    new RegExp(INSTALACION_QA),
  );
  // La persona y el negocio no dependen de la instalación: si falla, se anota y se sigue.
  if (!instalacion) await paso("instalación", () => crearInstalacion(page, cuentaId));
  const persona = await buscar(page, "personas", "Auditoría", /Persona QA/);
  if (!persona) await paso("persona", () => crearPersona(page));
  let negocioId = await buscar(page, "negocios", NEGOCIO_QA, new RegExp(NEGOCIO_QA));
  if (
    !negocioId &&
    !(await paso("negocio", async () => (negocioId = await crearNegocio(page, cuentaId))))
  )
    return notas;
  const cotizacion = await buscar(page, "cotizaciones", "Cotización QA", /Cotización QA/);
  if (!cotizacion) await paso("cotización", () => crearCotizacion(page, negocioId));
  return notas;
}
