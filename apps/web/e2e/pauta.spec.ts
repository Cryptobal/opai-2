import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pauta · Mensual (CAR-81): instalación ficticia sembrada por `seed:pauta-e2e` (Planta Pauta E2E, dos
// puestos y dos personas). Lectura a 375/1024/1280; la escritura (serie, excepción, historial) una
// sola vez, en iPad, para no repetirla por proyecto. Para repetir la corrida en local: `pnpm --filter @opai/db seed:pauta-e2e`.
const INST = "00000000-0000-7000-8000-0000000b0001";
const PUESTO_DIA = "00000000-0000-7000-8000-0000000b0002";
const HOY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("pauta · mensual", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("todas las instalaciones: cobertura por instalación, sin desbordar", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/pauta");
    await expect(page.getByText("Planta Pauta E2E").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Cobertura del mes")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
    ).toBe(true);
    await captura(page, "pauta-todas", info.project.name);
  });

  test("una instalación: puestos sin serie y selector de mes", async ({ page }, info) => {
    await entrar(page);
    await page.goto(`/pauta?inst=${INST}`);
    await expect(page.getByText("Portería Día").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Mes siguiente" })).toBeVisible();
    const enlaceSerie = page.getByRole("link", { name: /Portería Día/ }).filter({ visible: true }).first();
    await expect(enlaceSerie).toHaveAttribute("href", new RegExp(`inst=${INST}&mes=\\d{4}-\\d{2}&serie=${PUESTO_DIA}`));
    await captura(page, "pauta-instalacion", info.project.name);
  });

  test("diaria: selecciona fecha, abre hoja del turno y filtra sin cubrir", async ({ page }) => {
    await entrar(page);
    await page.goto(`/pauta?inst=${INST}&vista=diaria&fecha=${HOY}`);
    await expect(page.getByLabel("Fecha de la pauta")).toBeVisible();
    await expect(page.getByText("Asistencia no activada: sin marcas para cruzar.")).toBeVisible();
    const fila = page.getByRole("link", { name: /Portería Día:/ }).first();
    await expect(fila).toBeVisible();
    await fila.click();
    await expect(page).toHaveURL(/dia=/);
    // La hoja del turno es modal: mientras está abierta deja el resto de la página inerte
    // (aria-hidden), así que se cierra antes de usar el filtro de la barra.
    const hoja = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: /Portería Día/ }) });
    await expect(hoja).toBeVisible();
    await hoja.getByRole("button", { name: "Cerrar" }).first().click();
    await expect(hoja).toBeHidden();
    const sinCubrir = page.getByRole("button", { name: "Sin cubrir" });
    await hidratado(sinCubrir);
    await sinCubrir.click();
    await expect(page).toHaveURL(/ver=ppc/);
    await page.getByRole("button", { name: "Mensual" }).click();
    await expect(page.getByRole("button", { name: "Mes siguiente" })).toBeVisible();
  });

  test("fija la serie, registra una excepción, ve el PPC y el historial", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await page.goto(`/pauta?inst=${INST}&serie=${PUESTO_DIA}`);
    const guardar = page.getByRole("button", { name: "Guardar serie" });
    await hidratado(guardar);
    await expect(page.getByText("No modifica días pasados")).toBeVisible();
    await page.getByLabel("Titular").click();
    await page.getByRole("option", { name: "Ana Pauta E2E" }).click();
    await guardar.click();
    await expect(page.getByText("Serie guardada")).toBeVisible();
    await expect(page.getByText("Ana Pauta E2E · Portería").or(page.getByText("4×4 · Ana Pauta E2E")).first()).toBeVisible();

    await page.goto(`/pauta?inst=${INST}&dia=${PUESTO_DIA}_${HOY}`);
    const registrar = page.getByRole("button", { name: "Registrar" });
    await hidratado(registrar);
    await page.getByLabel("Motivo").fill("Licencia médica de prueba");
    await registrar.click();
    await expect(page.getByText(/Excepción registrada/)).toBeVisible();

    // Tras registrar, la hoja se cierra y queda la grilla mensual, cuyas celdas se nombran
    // «Puesto, fecha: estado» (la vista diaria usa «Puesto: estado»).
    await page.getByRole("link", { name: `Portería Día, ${HOY}: Sin cubrir · Ausencia · excepción` }).click();
    await expect(page).toHaveURL(/dia=/);
    await expect(page.getByRole("heading", { name: /Portería Día/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anular excepción" })).toBeVisible();
    await page.getByRole("button", { name: "Anular excepción" }).click();
    const confirmacion = page.getByRole("dialog", { name: "Anular excepción" });
    await expect(confirmacion).toBeVisible();
    await confirmacion.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("button", { name: "Anular excepción" })).toBeVisible();

    await page.goto(`/pauta?inst=${INST}`);
    await expect(page.getByText("Ana Pauta E2E").first()).toBeVisible();
    await captura(page, "pauta-grilla", info.project.name);

    await page.goto(`/pauta?inst=${INST}&ver=ppc`);
    await expect(page.getByText("Portería Día").first()).toBeVisible();
    await captura(page, "pauta-ppc", info.project.name);

    await page.goto(`/pauta?inst=${INST}&historial=1`);
    await expect(page.getByText(/fijó la serie de Portería Día/).first()).toBeVisible();
    await expect(page.getByText(/registró Ausencia en Portería Día/).first()).toBeVisible();
    await captura(page, "pauta-historial", info.project.name);
  });
});
