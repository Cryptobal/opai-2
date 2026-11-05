import { expect, type Page, test } from "@playwright/test";

import { digitoVerificador } from "@opai/domain";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Maestros (Brief 02, sesión C): personas (lista, alta con vínculo, laboral, sueldo en tres
// niveles), cargos, vencimientos, Inicio y terreno del supervisor, a 375, 1024 y 1280.

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

/** RUT válido y único por corrida (cuerpo de 8 dígitos desde la hora). */
function rutNuevo() {
  const cuerpo = String(20_000_000 + (Date.now() % 9_000_000));
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
}

// El servidor de desarrollo compila cada ruta en su primera visita.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("maestros con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Inicio, cuentas, instalaciones, cargos y vencimientos", async ({ page }, info) => {
    const p = info.project.name;
    await entrar(page);
    await page.goto("/");
    await expect(page.getByText("Requiere tu decisión hoy")).toBeVisible();
    await captura(page, "maestros-inicio", p);
    for (const [ruta, nombre] of [
      ["/cuentas", "cuentas"],
      ["/instalaciones", "instalaciones"],
      ["/cargos", "cargos"],
      ["/personas/vencimientos", "vencimientos"],
    ] as const) {
      await page.goto(ruta);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      await captura(page, `maestros-${nombre}`, p);
    }
  });

  test("alta de persona con vínculo, laboral y sueldo", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await page.goto("/personas?nueva=1");
    const dialogo = page.getByRole("dialog", { name: "Agregar persona" });
    // La hoja se carga aparte (`hojaDiferida`): en `next dev` su primera compilación pasa de 5 s.
    await expect(dialogo).toBeVisible({ timeout: 30_000 });
    await dialogo.getByLabel("Nombres").fill("Prueba");
    await dialogo.getByLabel("Apellidos").fill(`E2E ${Date.now()}`);
    await dialogo.getByLabel("RUT").fill(rutNuevo());
    await dialogo.getByLabel("Cargo").click();
    await page.getByRole("option").first().click();
    // Desde el 07b (#89) el vínculo exige instalación y jornada pactada (horas y distribución).
    await dialogo.getByRole("button", { name: "Instalación obligatoria" }).click();
    await page.getByRole("option").first().click();
    await dialogo.getByLabel("Horas semanales").fill("45");
    await dialogo.getByLabel("Distribución").fill("Lunes a sábado");
    await dialogo.getByRole("button", { name: "Crear persona" }).click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}$/);
    await expect(
      page
        .getByRole("tab", { name: /Laboral/ })
        .or(page.getByRole("link", { name: "Laboral" }))
        .first(),
    ).toBeVisible();
    await captura(page, "maestros-persona", "ipad");

    // Desde el 07b (#87, #89, #93) Laboral muestra el vínculo con su jornada y el sueldo vive en su
    // pestaña con las capas («Estructura de sueldo efectiva» y «Cómo se arma» ya no existen).
    await page.getByRole("link", { name: "Laboral" }).first().click();
    await expect(page.getByText("Instalación y jornada pactada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("45 h semanales · Lunes a sábado")).toBeVisible();
    await captura(page, "maestros-persona-laboral", "ipad");

    await page.getByRole("link", { name: /^Sueldo/ }).first().click();
    await expect(page.getByRole("heading", { name: "Capas de sueldo" })).toBeVisible({
      timeout: 30_000,
    });
    await captura(page, "maestros-persona-sueldo", "ipad");
  });

  test("terreno del supervisor", async ({ page }, info) => {
    test.skip(info.project.name !== "telefono", "Terreno es de teléfono");
    await entrar(page);
    await page.goto("/supervisor/instalaciones");
    await expect(page.getByRole("heading", { name: "Instalaciones" })).toBeVisible();
    await captura(page, "terreno-instalaciones", "telefono");
    await page.goto("/supervisor");
    await expect(page.getByText("Documentos pendientes")).toBeVisible();
    await captura(page, "terreno-hoy", "telefono");
  });
});
