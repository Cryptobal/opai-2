import { expect, type Page, test } from "@playwright/test";

import { codigoTotp, E2E_EMAIL, E2E_PASSWORD } from "./sesion";

// Segundo factor (NÚCLEO-F): login con TOTP (generado en el test) y entrada directa de un owner
// sin segundo factor (CAR-286: ya no es obligatorio). A 375, 1024 y 1280. El usuario plataforma de e2e
// tiene MFA con un secreto fijo sembrado por seed:e2e-mfa; `mfa-pendiente-e2e` es owner SIN segundo factor.
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
    const campo = page.getByLabel("Código del autenticador");
    await expect(campo).toHaveAttribute("autocapitalize", "none");
    await expect(campo).toHaveAttribute("autocorrect", "off");
    await expect(campo).toHaveAttribute("spellcheck", "false");
    await expect(campo).toHaveAttribute("inputmode", "numeric");
    await page.getByRole("button", { name: "Usar un código de respaldo" }).click();
    const respaldo = page.getByLabel("Código de respaldo");
    await expect(respaldo).toHaveAttribute("autocapitalize", "none");
    await expect(respaldo).toHaveAttribute("autocorrect", "off");
    await expect(respaldo).toHaveAttribute("spellcheck", "false");
    await expect(respaldo).toHaveAttribute("inputmode", "text");
    await page.getByRole("button", { name: "Usar mi autenticador" }).click();
    await captura(page, "mfa-verificar", p);
    await page.getByLabel(/Código/).fill(await codigoTotp());
    await page.getByRole("button", { name: "Verificar" }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
    await captura(page, "mfa-entrada", p);
  });

  test("un owner sin segundo factor entra solo con contraseña (CAR-286)", async ({ page }, info) => {
    const p = info.project.name;
    await page.goto("/login");
    await page.getByLabel("Correo").fill(PENDIENTE);
    await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    // El MFA ya no es obligatorio para owner ni admin: entra sin pasar por /activar-mfa ni /mfa.
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/elegir-empresa");
    expect(new URL(page.url()).pathname).not.toBe("/activar-mfa");
    await captura(page, "mfa-owner-sin-segundo-factor", p);
  });
});
