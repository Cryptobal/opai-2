import { expect, type Page, test } from "@playwright/test";

// Brief 07 · PR 1 — evidencia visual de Negocios y Contactos a 375, 1024 y 1280 px, con el mismo
// shell que /cuentas e /instalaciones. No es regresión visual: son capturas de evidencia (QA).
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("Comercial · Negocios y Contactos", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Negocios: lista y ficha", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/negocios");
    const lista = page.getByRole("region", { name: "Lista de negocios" });
    await expect(lista).toBeVisible();
    await page.screenshot({ path: `e2e/__screenshots__/negocios-lista-${info.project.name}.png`, fullPage: true });
    const primero = lista.getByRole("link").first();
    if (await primero.count()) {
      await primero.click();
      await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
      await expect(page.getByRole("link", { name: /^Actividad/ }).first()).toBeVisible();
      await page.screenshot({ path: `e2e/__screenshots__/negocio-ficha-${info.project.name}.png`, fullPage: true });
    }
  });

  test("Contactos: lista y ficha", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/contactos");
    const lista = page.getByRole("region", { name: "Lista de contactos" });
    await expect(lista).toBeVisible();
    await page.screenshot({ path: `e2e/__screenshots__/contactos-lista-${info.project.name}.png`, fullPage: true });
    const primero = lista.getByRole("link").first();
    if (await primero.count()) {
      await primero.click();
      await page.waitForURL(/\/contactos\/[0-9a-f-]{36}/);
      await page.screenshot({ path: `e2e/__screenshots__/contacto-ficha-${info.project.name}.png`, fullPage: true });
    }
  });
});
