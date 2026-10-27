import { expect, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Cuentas, Instalaciones y Personas (24-oct): al cambiar de pestaña de la ficha, la lista sigue a la
// izquierda en escritorio. Solo corre a 1280 px (proyecto desktop); a 375 la ficha ocupa la pantalla.

const MODULOS = [
  {
    ruta: "/cuentas",
    lista: "Lista de cuentas",
    tabs: ["Contactos", "Instalaciones", "Documentos", "Actividad", "Resumen"],
  },
  {
    ruta: "/instalaciones",
    lista: /^Lista de /,
    tabs: ["Puestos", "Documentos", "Actividad", "Resumen"],
  },
  {
    ruta: "/personas",
    lista: "Lista de personas",
    tabs: ["Laboral", "Documentos", "Actividad", "Resumen"],
  },
] as const;

test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);

test.describe("la lista queda fija al cambiar de pestaña (1280 px)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  for (const m of MODULOS) {
    test(`${m.ruta}: todas las pestañas de la ficha conservan la lista`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "Se prueba a 1280 px");
      await entrar(page);
      await page.goto(m.ruta);
      const lista = page.getByRole("region", { name: m.lista });
      await expect(lista).toBeVisible();
      const fila = lista.locator(`a[href^="${m.ruta}/"][href*="-"]`).first();
      await fila.click();
      await page.waitForURL(new RegExp(`${m.ruta}/[0-9a-f-]{36}$`));
      const ficha = page.getByRole("region", { name: "Detalle" });
      await expect(ficha).toBeVisible();
      for (const tab of m.tabs) {
        const enlace = ficha.getByRole("link", { name: new RegExp(`^${tab}`) }).first();
        const destino = new URL((await enlace.getAttribute("href")) ?? "", page.url()).pathname;
        await enlace.click();
        // En CI corre `pnpm dev`: cada pestaña tarda 4–6 s en responder (compilación y `generate-params`).
        // Se espera el cambio de ruta (acotado solo por el tiempo del test) y recién entonces se afirma.
        await page.waitForURL((url) => url.pathname === destino);
        await expect(
          ficha
            .locator('[aria-current="page"], [aria-selected="true"]')
            .filter({ hasText: new RegExp(`^${tab}`) })
            .first(),
        ).toBeVisible();
        await expect(lista, `la lista se ve en ${tab}`).toBeVisible();
        await expect(fila).toBeVisible();
        await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      }
    });
  }

  test("Personas: las pestañas de la ficha conservan búsqueda y página de la lista", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Se prueba a 1280 px");
    await entrar(page);
    await page.goto("/personas?q=a");
    const lista = page.getByRole("region", { name: "Lista de personas" });
    await lista.locator('a[href^="/personas/"][href*="-"]').first().click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}\?q=a/);
    const ficha = page.getByRole("region", { name: "Detalle" });
    for (const tab of ["Laboral", "Documentos", "Actividad", "Resumen"]) {
      const enlace = ficha.getByRole("link", { name: new RegExp(`^${tab}`) }).first();
      await expect(enlace).toHaveAttribute("href", /\?q=a/);
    }
  });

  test("Personas sin pestaña de Cargos; Cargos sin pestañas de Personas", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Se prueba a 1280 px");
    await entrar(page);
    await page.goto("/personas");
    await expect(page.getByRole("link", { name: "Vencimientos" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Cargos y sueldos" })).toHaveCount(1); // solo el menú lateral
    await page.goto("/cargos");
    await expect(page.getByRole("link", { name: "Vencimientos" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Cargos y sueldos" })).toHaveCount(1);
    await page.goto("/personas/cargos");
    await expect(page).toHaveURL(/\/cargos$/);
  });
});
