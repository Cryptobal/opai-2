import { expect, type Page, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";

// Plataforma (Brief 02, sesión C, diseños 48–51): empresas, ficha con pestañas, ajustes,
// trabajos y consumos, a 375, 1024 y 1280. Usuario plataforma sembrado en dev.

// En desarrollo cada ruta compila al primer uso: esperas amplias.
const esperar = expect.configure({ timeout: 60_000 });

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("plataforma con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("empresas, ficha, ajustes, trabajos y consumos", async ({ page }, info) => {
    test.setTimeout(300_000);
    const p = info.project.name;
    await entrar(page);

    await page.goto("/platform");
    const gard = page.getByText("Gard Security").filter({ visible: true }).first();
    await esperar(gard).toBeVisible();
    await captura(page, "plataforma-empresas", p);

    await gard.click();
    await page.waitForURL(/\/platform\/tenants\/[0-9a-f-]{36}$/);
    await esperar(
      page.getByText("Llamadas API y MCP").filter({ visible: true }).first(),
    ).toBeVisible();
    await captura(page, "plataforma-empresa", p);
    const pestanas: { nombre: string; ruta: RegExp }[] = [
      { nombre: "Módulos", ruta: /\/modulos$/ },
      { nombre: "Usuarios", ruta: /\/usuarios$/ },
      { nombre: "Consumo de esta empresa", ruta: /\/consumos$/ },
      { nombre: "Trabajos de esta empresa", ruta: /\/trabajos$/ },
      { nombre: "Agentes", ruta: /\/agentes$/ },
      { nombre: "Integraciones", ruta: /\/integraciones$/ },
    ];
    for (const tab of pestanas) {
      await page
        .getByRole("navigation", { name: "Secciones" })
        .getByRole("link", { name: new RegExp(`^${tab.nombre}`) })
        .first()
        .click();
      await page.waitForURL(tab.ruta, { timeout: 60_000 });
    }

    await page.goto("/platform/ajustes/modelos");
    await esperar(page.getByRole("button", { name: "Guardar" })).toBeVisible();
    await captura(page, "plataforma-ajustes", p);

    await page.goto("/platform/trabajos");
    await esperar(page.getByRole("button", { name: /Filtrar por estado/ })).toBeVisible();
    await captura(page, "plataforma-trabajos", p);

    await page.goto("/platform/consumos");
    await esperar(page.getByText(/Últimos 30 días/)).toBeVisible();
  });
});
