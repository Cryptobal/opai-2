import { expect, test } from "@playwright/test";

// Caché del navegador (staleTimes de 5 min, ADR-045): cerrar sesión en una pestaña no deja a otra
// pestaña del mismo navegador mostrando páginas de una sesión que ya no existe.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("caché y sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("salir en una pestaña recarga la otra", async ({ context, page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
    await page.goto("/personas");
    await expect(page.getByRole("region", { name: /lista/i })).toBeVisible();

    const otra = await context.newPage();
    await otra.goto("/cuentas");
    await expect(otra.getByRole("region", { name: /lista/i })).toBeVisible();

    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("menuitem", { name: /Cerrar sesión|Salir/i }).click();
    await page.waitForURL(/\/login/);

    await otra.waitForURL(/\/login/, { timeout: 15_000 });
  });
});
