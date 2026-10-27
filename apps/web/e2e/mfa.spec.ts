import { expect, type Page, test } from "@playwright/test";

import { codigoTotp, E2E_EMAIL, E2E_PASSWORD } from "./sesion";

// Segundo factor (NÚCLEO-F): login con TOTP (generado en el test) y enrolamiento forzado para un rol
// obligado sin segundo factor. A 375, 1024 y 1280. El owner de e2e tiene MFA con un secreto fijo
// sembrado por seed:e2e-mfa; el usuario `mfa-pendiente-e2e` es owner obligado SIN segundo factor.
const PENDIENTE = "mfa-pendiente-e2e@opai.cl";

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("segundo factor", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("login con segundo factor: pide el código TOTP y entra", async ({ page }, info) => {
    const p = info.project.name;
    await page.goto("/login");
    await page.getByLabel("Correo").fill(E2E_EMAIL);
    await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.pathname === "/mfa");
    await expect(page.getByRole("heading", { name: "Verifica tu identidad" })).toBeVisible();
    await captura(page, "mfa-verificar", p);
    await page.getByLabel(/Código/).fill(await codigoTotp());
    await page.getByRole("button", { name: "Verificar" }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
    await captura(page, "mfa-entrada", p);
  });

  test("un rol obligado sin segundo factor va a enrolarse antes de entrar", async ({ page }, info) => {
    const p = info.project.name;
    await page.goto("/login");
    await page.getByLabel("Correo").fill(PENDIENTE);
    await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    // No accede al ERP: la política lo manda a enrolar el segundo factor.
    await page.waitForURL((url) => url.pathname === "/activar-mfa");
    await expect(page.getByRole("heading", { name: "Activa el segundo factor" })).toBeVisible();
    // Paso 1: confirma la contraseña y aparecen el QR, la clave manual y los códigos de respaldo.
    await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Escanea el código" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Código QR/ })).toBeVisible();
    await expect(page.locator("[data-mfa-secret]")).toBeVisible();
    await captura(page, "mfa-enrolar", p);
  });
});
