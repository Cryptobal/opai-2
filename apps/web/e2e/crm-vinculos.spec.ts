import { expect as base, type Page, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

const expect = base.configure({ timeout: 30_000 });
test.use({ actionTimeout: 30_000 });
test.setTimeout(300_000);

async function crearCuenta(page: Page, nombre: string) {
  await page.goto("/cuentas?nueva=1");
  const hoja = page.getByRole("dialog", { name: "Nueva cuenta" });
  await hoja.getByLabel("Nombre", { exact: true }).fill(nombre);
  await hoja.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.waitForURL(/\/cuentas\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname;
}

test("CRM: segunda cuenta, roles por vínculo y principal", async ({ page }, info) => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  // Solo datos ficticios creados por este flujo, sin tocar los contactos del seed.
  const sufijo = `${info.project.name}-${Date.now()}`;
  const nombreA = `CRM primera ${sufijo}`;
  const nombreB = `CRM segunda ${sufijo}`;
  await entrar(page);
  const cuentaA = await crearCuenta(page, nombreA);
  const cuentaB = await crearCuenta(page, nombreB);
  await page.goto(`${cuentaA}/contactos?contacto=nuevo`);
  const alta = page.getByRole("dialog", { name: "Nuevo contacto" });
  await alta.getByLabel("Nombres", { exact: true }).fill("Persona ficticia");
  await alta.getByLabel("Apellidos", { exact: true }).fill(sufijo);
  await alta.getByRole("button", { name: "Crear contacto", exact: true }).click();
  await expect(alta).toHaveCount(0);
  await page.getByRole("link", { name: new RegExp(`Persona ficticia ${sufijo}`) }).click();
  await page.waitForURL(/\/contactos\/[0-9a-f-]{36}$/);
  const contacto = new URL(page.url()).pathname;
  const cuentas = page.getByRole("list", { name: "Cuentas vinculadas" });
  await expect(cuentas.getByRole("listitem")).toHaveCount(1);
  const vincular = page.getByRole("button", { name: "Vincular a otra cuenta", exact: true });
  await vincular.click();
  const hoja = page.getByRole("dialog", { name: "Vincular a otra cuenta", exact: true });
  await hoja.getByRole("button", { name: "Cuenta", exact: true }).click();
  await page.getByRole("combobox").last().fill(nombreB);
  await page.getByRole("option", { name: nombreB, exact: true }).click();
  await hoja.getByLabel("Cargo en esta cuenta").fill("Compras");
  await hoja.getByRole("checkbox", { name: "Cesión", exact: true }).check();
  await hoja.getByRole("button", { name: "Vincular contacto", exact: true }).click();
  await expect(hoja).toHaveCount(0);
  await expect(cuentas.getByRole("listitem")).toHaveCount(2);
  await expect(vincular).toBeFocused();
  const segunda = cuentas.getByRole("listitem").filter({ hasText: nombreB });
  await segunda.getByRole("button", { name: `Editar vínculo con ${nombreB}`, exact: true }).click();
  const editar = page.getByRole("dialog", { name: "Editar vínculo", exact: true });
  await editar.getByRole("switch", { name: "Principal en esta cuenta", exact: true }).check();
  await editar.getByRole("button", { name: "Guardar vínculo", exact: true }).click();
  await expect(editar).toHaveCount(0);
  await expect(segunda.getByText("Principal en esta cuenta", { exact: true })).toBeVisible();
  await expect(segunda.getByText("Compras", { exact: true })).toBeVisible();
  await expect(segunda.getByText("Cesión", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Editar datos", exact: true }).click();
  const personal = page.getByRole("dialog", { name: "Editar contacto", exact: true });
  await personal.getByLabel("Teléfono").fill("+56911112222");
  await expect(personal.getByRole("switch")).toHaveCount(0);
  await personal.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(personal).toHaveCount(0);
  await expect(segunda.getByText("Principal en esta cuenta", { exact: true })).toBeVisible();
  await expect(segunda.getByText("Cesión", { exact: true })).toBeVisible();
  await expect(
    cuentas.getByRole("listitem").filter({ hasText: nombreA }).getByText("Sin roles"),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((e) => e.clientWidth),
  );
  await page.screenshot({ path: info.outputPath("contacto-dos-cuentas.png"), fullPage: true });
  await page.goto(`${cuentaB}/contactos`);
  const fila = page.getByRole("link", { name: new RegExp(`Persona ficticia ${sufijo}`) });
  await expect(fila).toContainText("Compras");
  await expect(fila).toContainText("Principal");
  await expect(fila).toContainText("Cesión");
  await page.screenshot({
    path: info.outputPath("cuenta-contacto-compartido.png"),
    fullPage: true,
  });
  await page.goto(contacto);
  await cuentas
    .getByRole("listitem")
    .filter({ hasText: nombreB })
    .getByRole("button", { name: `Desvincular de ${nombreB}`, exact: true })
    .click();
  const confirmar = page.getByRole("dialog", { name: "Desvincular contacto", exact: true });
  await expect(confirmar.getByText(/Esta acción es irreversible/)).toBeVisible();
  await confirmar.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(cuentas.getByRole("listitem")).toHaveCount(2);
  await cuentas
    .getByRole("listitem")
    .filter({ hasText: nombreB })
    .getByRole("button", { name: `Desvincular de ${nombreB}`, exact: true })
    .click();
  await confirmar.getByRole("button", { name: "Desvincular", exact: true }).click();
  await expect(confirmar).toHaveCount(0);
  await expect(cuentas.getByRole("listitem")).toHaveCount(1);
  await page.reload();
  await expect(cuentas.getByRole("listitem")).toHaveCount(1);
});
