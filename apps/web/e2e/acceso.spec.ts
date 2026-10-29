import { expect, type Page, test } from "@playwright/test";

import { E2E_EMAIL as email, E2E_PASSWORD as password, entrar } from "./sesion";

// Flujo de acceso (Brief 01): login con el usuario plataforma sembrado en la rama dev, ERP,
// Configuración → Usuarios y Plataforma. Capturas en e2e/__screenshots__/.
// Desde NÚCLEO-F el owner tiene segundo factor obligatorio: `entrar` pasa por /mfa con un TOTP.

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test("sin sesión, un portal redirige a /login", async ({ page }) => {
  await page.goto("/configuracion/usuarios");
  await expect(page).toHaveURL(/\/login\?next=%2Fconfiguracion%2Fusuarios/);
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
});

test("credenciales incorrectas muestran el error en línea", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("El correo o la contraseña no coinciden")).toBeVisible();
});

test.describe("con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("login, ERP, Usuarios y Plataforma", async ({ page }, info) => {
    const p = info.project.name;
    // DIAGNÓSTICO TEMPORAL (#131): errores del navegador durante el test.
    page.on("console", (m) => {
      if (m.type() === "error") console.log("[diag-131] consola:", m.text().slice(0, 300));
    });
    page.on("pageerror", (e) => console.log("[diag-131] pageerror:", e.message.slice(0, 300)));
    await page.goto("/login");
    await captura(page, "login", p);
    await entrar(page);

    await page.goto("/");
    // DIAGNÓSTICO TEMPORAL (#131): qué carga `/` en CI tras entrar. Se revierte al tener el dato.
    console.log("[diag-131] url:", page.url());
    console.log("[diag-131] headings:", await page.getByRole("heading").allInnerTexts());
    console.log("[diag-131] alertas:", await page.getByRole("alert").allInnerTexts());
    const t0 = Date.now();
    const visto = await page
      .getByRole("heading", { name: "Inicio" })
      .first()
      .waitFor({ state: "attached", timeout: 30_000 })
      .then(() => "sí")
      .catch(() => "no");
    console.log("[diag-131] título Inicio:", visto, Date.now() - t0, "ms");
    // En teléfono la barra no lleva título: el encabezado de la pantalla es el saludo.
    const titulo = p === "telefono" ? /^Hola, / : "Inicio";
    await expect(page.getByRole("heading", { name: titulo }).first()).toBeAttached();
    await captura(page, "erp-inicio", p);

    await page.goto("/configuracion/usuarios");
    await expect(page.getByText(email).filter({ visible: true }).first()).toBeVisible();
    await captura(page, "erp-usuarios", p);

    await page.goto("/platform");
    await expect(page.getByText("Gard Security").filter({ visible: true }).first()).toBeVisible();
    await captura(page, "platform-tenants", p);
    await page
      .locator('a[href^="/platform/tenants/"]')
      .filter({ hasText: "Gard Security", visible: true })
      .first()
      .click();
    await page.waitForURL(/\/platform\/tenants\/[0-9a-f-]{36}$/);
    // Las pestañas de la ficha son rutas: enlaces dentro de la navegación «Secciones».
    const secciones = page.getByRole("navigation", { name: "Secciones" });
    await expect(secciones.getByRole("link", { name: /Módulos/ })).toBeVisible({ timeout: 30_000 });
    await captura(page, "platform-tenant", p);
  });
});
