import { expect, type Page, test } from "@playwright/test";
import { hidratado } from "./hidratacion";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Configuración → Calendario (CAR-79): lista de feriados del año (nacionales de plataforma más los
// de la empresa) a 375, 1024 y 1280, y el alta de un día propio desde la hoja «Agregar día».

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("configuración → calendario", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("lista los feriados nacionales del año", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/calendario");
    // El seed de plataforma trae los feriados nacionales de 2026 (año por defecto).
    await expect(page.getByText("Independencia Nacional").first()).toBeVisible();
    await expect(page.getByText("Navidad").first()).toBeVisible();
    await captura(page, "config-calendario", info.project.name);
  });

  test("agrega y archiva un día propio de la empresa", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await page.goto("/configuracion/calendario");
    const abrir = page.getByRole("link", { name: "Agregar día" });
    await hidratado(abrir);
    await abrir.click();
    const nombre = `Aniversario E2E ${Date.now()}`;
    await page.getByLabel("Nombre").fill(nombre);
    // La fecha usa el InputFecha del DS (se escribe dd-mm-aaaa; el valor interno es ISO).
    await page.getByLabel("Fecha").fill("24-11-2026");
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText(nombre).first()).toBeVisible();

    // Se edita desde la fila y se archiva, para no dejar residuo entre corridas.
    await page.getByRole("link", { name: nombre }).click();
    await page.getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByText(nombre)).toHaveCount(0);
  });
});
