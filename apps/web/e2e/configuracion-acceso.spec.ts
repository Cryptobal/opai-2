import { expect, type Page, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Configuración · Acceso (Brief 02, sesión C, bloque 12): usuarios y permisos, agentes (crear key,
// presupuesto, revocar), conectar tu IA y bandeja de aprobaciones, a 375, 1024 y 1280.

async function captura(page: Page, nombre: string, proyecto: string) {
  await page.screenshot({ path: `e2e/__screenshots__/${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("configuración · acceso", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("usuarios, agentes, conectar y aprobaciones", async ({ page }, info) => {
    const p = info.project.name;
    await entrar(page);
    await page.goto("/configuracion/usuarios");
    await expect(page.getByRole("link", { name: "Roles", exact: true })).toBeVisible();
    await captura(page, "config-usuarios", p);
    await page.goto("/configuracion/api-keys");
    await expect(page).toHaveURL(/\/configuracion\/agentes$/);
    await expect(page.getByRole("link", { name: "Conectar tu IA", exact: true })).toBeVisible();
    await captura(page, "config-agentes", p);
    await page.goto("/configuracion/agentes/conectar");
    await expect(page.getByText(/\/api\/mcp/).first()).toBeVisible();
    await captura(page, "config-conectar", p);
    await page.goto("/configuracion/aprobaciones");
    await expect(page.getByRole("heading", { name: /Aprobaciones/ }).first()).toBeAttached();
    await expect(page.getByRole("link", { name: "Historial", exact: true })).toBeVisible();
    await captura(page, "config-aprobaciones", p);
  });

  test("crear una key, fijar su presupuesto y revocarla", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    const nombre = `E2E ${Date.now()}`;
    await page.goto("/configuracion/agentes?crear=1");
    const hoja = page.getByRole("dialog", { name: "Crear key" });
    await hoja.getByLabel("Nombre").fill(nombre);
    await hoja.getByLabel("Presupuesto mensual (US$)").fill("15");
    await hoja.getByRole("button", { name: "Crear" }).click();
    const creada = page.getByRole("dialog", { name: `Key creada: ${nombre}` });
    await expect(creada.getByText(/^opai_/)).toBeVisible();
    await creada.getByRole("button", { name: "Ya lo copié" }).click();
    await page.getByRole("link", { name: new RegExp(nombre) }).click();
    await page.waitForURL(/\/configuracion\/agentes\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    await expect(page.getByLabel("Tope en US$")).toHaveValue("15", { timeout: 30_000 });
    await page.getByLabel("Tope en US$").fill("20");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await expect(page.getByText("Cambios guardados")).toBeVisible({ timeout: 15_000 });
    await captura(page, "config-agente", "ipad");
    await page.getByRole("button", { name: "Revocar key" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Revocar" }).click();
    await page.waitForURL(/\/configuracion\/agentes$/, { timeout: 60_000 });
    await expect(page.getByText("Revocada").first()).toBeVisible();
  });

  // CAR-54: el owner restablece el MFA de un miembro de su empresa (irreversible, con aviso por
  // correo). Usa el teammate sembrado con MFA activo (`seed:e2e`): nadie más depende de su estado.
  test("restablecer el MFA de un miembro con el segundo factor activo", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await page.goto("/configuracion/usuarios");
    await page.getByRole("link", { name: "Restablecer MFA E2E" }).click();
    await page.waitForURL(/\?editar=/);
    await page.getByRole("button", { name: "Restablecer MFA" }).click();
    const dialogo = page.getByRole("dialog", { name: "¿Restablecer MFA de Restablecer MFA E2E?" });
    await expect(dialogo.getByText("Esta acción es irreversible")).toBeVisible();
    await dialogo.getByRole("button", { name: "Restablecer MFA" }).click();
    await expect(page.getByText("Segundo factor restablecido")).toBeVisible();
  });
});
