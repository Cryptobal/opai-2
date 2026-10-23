import { expect, type Page, test } from "@playwright/test";

// Plataforma (Brief 02, sesión C, diseños 48–51): empresas, ficha con pestañas, ajustes,
// trabajos y consumos, a 375, 1024 y 1280. Usuario plataforma sembrado en dev.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

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
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");

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
    for (const tab of ["Módulos", "Usuarios", "Consumos", "Trabajos", "Agentes", "Integraciones"]) {
      await page
        .getByRole("navigation", { name: "Secciones" })
        .getByRole("link", { name: new RegExp(`^${tab}`) })
        .first()
        .click();
      const ruta = tab
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      await page.waitForURL(new RegExp(`/${ruta}$`), { timeout: 60_000 });
    }

    await page.goto("/platform/ajustes");
    await esperar(page.getByRole("button", { name: "Guardar" })).toBeVisible();
    await captura(page, "plataforma-ajustes", p);

    await page.goto("/platform/trabajos");
    await esperar(page.getByRole("button", { name: /Filtrar por estado/ })).toBeVisible();
    await captura(page, "plataforma-trabajos", p);

    await page.goto("/platform/consumos");
    await esperar(page.getByText(/Últimos 30 días/)).toBeVisible();
  });
});
