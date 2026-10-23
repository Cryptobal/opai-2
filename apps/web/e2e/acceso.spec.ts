import { expect, type Page, test } from "@playwright/test";

// Flujo de acceso (Brief 01): login con el usuario plataforma sembrado en la rama dev, ERP,
// Configuración → Usuarios y Plataforma. Capturas en e2e/__screenshots__/.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test("sin sesión, un portal redirige a /login", async ({ page }) => {
  await page.goto("/configuracion/usuarios");
  await expect(page).toHaveURL(/\/login\?next=%2Fconfiguracion%2Fusuarios/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("credenciales incorrectas muestran el error en línea", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("incorrecta-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});

test.describe("con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("login, ERP, Usuarios y Plataforma", async ({ page }, info) => {
    const p = info.project.name;
    await page.goto("/login");
    await captura(page, "login", p);
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Inicio" }).first()).toBeAttached();
    await captura(page, "erp-inicio", p);

    await page.goto("/configuracion/usuarios");
    await expect(page.getByText(email).filter({ visible: true }).first()).toBeVisible();
    await captura(page, "erp-usuarios", p);

    await page.goto("/platform");
    await expect(page.getByText("Gard Security").filter({ visible: true }).first()).toBeVisible();
    await captura(page, "platform-tenants", p);
    await page.getByText("Gard Security").filter({ visible: true }).first().click();
    await expect(page.getByRole("tab", { name: /Módulos/ })).toBeVisible();
    await captura(page, "platform-tenant", p);
  });
});
