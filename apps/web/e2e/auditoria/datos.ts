import { type Page } from "@playwright/test";

import { digitoVerificador } from "@opai/domain";

// Datos ficticios para que la auditoría pueda abrir fichas y entrar a Guardia y Terreno (CAR-372).
// Los crea el dueño de `qa-e2e` desde la pantalla, en la rama de Neon de la vista previa (se descarta
// con el PR). Nunca Gard ni datos reales. Si la cuenta de prueba ya existe, no se crea nada.

export const CUENTA_QA = "Cuenta QA auditoría";
const INSTALACION_QA = "Instalación QA auditoría";

/** RUT válido y único por corrida (cuerpo de 8 dígitos desde la hora). */
function rutNuevo() {
  const cuerpo = String(20_000_000 + (Date.now() % 9_000_000));
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
}

async function yaExiste(page: Page): Promise<boolean> {
  await page.goto(`/cuentas?q=${encodeURIComponent(CUENTA_QA)}`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  return (await page.getByRole("link", { name: new RegExp(CUENTA_QA) }).count()) > 0;
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
  await page.getByRole("button", { name: "Crear instalación", exact: true }).click();
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

/** Crea cuenta, instalación y persona con RUT; devuelve notas de lo que no se pudo crear. */
export async function prepararDatos(page: Page): Promise<string[]> {
  if (await yaExiste(page)) return [];
  const notas: string[] = [];
  const paso = async (nombre: string, f: () => Promise<unknown>) =>
    f().then(
      () => true,
      (e: unknown) => (notas.push(`${nombre}: ${String(e).slice(0, 160)}`), false),
    );
  let cuentaId = "";
  if (!(await paso("cuenta", async () => (cuentaId = await crearCuenta(page))))) return notas;
  if (!(await paso("instalación", () => crearInstalacion(page, cuentaId)))) return notas;
  await paso("persona", () => crearPersona(page));
  return notas;
}
