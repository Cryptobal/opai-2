import { expect, type Page, test } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-323: Usuarios de plataforma, Auditoría y Editar empresa. En `preview-e2e` la cuenta de `qa-e2e` no
// tiene rol de plataforma (la vista previa copia la base con Gard) y estas pruebas se omiten. Las capturas
// salen del job e2e de CI: Postgres efímero con datos ficticios y la cuenta de plataforma sembrada con una
// contraseña aleatoria del propio job (decisión de Carlos del 14-nov). Allí se edita la empresa ficticia
// `otra-e2e`; en la vista previa, `qa-e2e`. Nunca Gard.
const EMPRESA = EN_PREVIEW
  ? { q: "qa-e2e", nombre: /QA E2E/, nuevo: "QA E2E (ficticia) · revisión" }
  : { q: "otra-e2e", nombre: /Empresa E2E/, nuevo: "Empresa E2E · revisión" };
async function conPlataforma(page: Page): Promise<boolean> {
  await entrar(page);
  await page.goto("/platform");
  return (await page.getByText("Plataforma es solo para el equipo de OPAI.").count()) === 0;
}

test.describe("@preview plataforma: paridad con el MCP (CAR-323)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("usuarios de plataforma: lista y cambio de rol en dos pasos", async ({ page }, info) => {
    test.skip(!(await conPlataforma(page)), "La cuenta de QA no tiene rol de plataforma");
    await page.goto("/platform/usuarios");
    await expect(page.getByRole("button", { name: "Dar rol a un correo" })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "plataforma-usuarios");
    await page.getByRole("button", { name: "Dar rol a un correo" }).click();
    await expect(page.getByRole("button", { name: "Revisar" })).toBeVisible();
    await capturar(page, info, "plataforma-usuarios-rol");
    await page.getByRole("button", { name: "Cancelar" }).click();
  });

  test("auditoría de plataforma: filtros y antes y después", async ({ page }, info) => {
    test.skip(!(await conPlataforma(page)), "La cuenta de QA no tiene rol de plataforma");
    await page.goto("/platform/auditoria?dias=30");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "plataforma-auditoria");
  });

  test("editar empresa: vista previa antes de guardar, sin guardar", async ({ page }, info) => {
    test.skip(!(await conPlataforma(page)), "La cuenta de QA no tiene rol de plataforma");
    // Solo una empresa ficticia, nunca Gard.
    await page.goto(`/platform?q=${EMPRESA.q}`);
    const fila = page.getByRole("main").getByText(EMPRESA.nombre).filter({ visible: true }).first();
    test.skip((await fila.count()) === 0, `La empresa ${EMPRESA.q} no aparece en Plataforma`);
    await fila.click();
    await page.getByRole("button", { name: "Acciones de la empresa" }).click();
    await page.getByRole("menuitem", { name: "Editar empresa" }).click();
    await page.getByLabel("Nombre").fill(EMPRESA.nuevo);
    await page.getByRole("button", { name: "Revisar cambios" }).click();
    await expect(page.getByText("Revisa antes de confirmar")).toBeVisible();
    await capturar(page, info, "plataforma-editar-empresa");
    await page.getByRole("button", { name: "Cancelar" }).click();
    // La pestaña de la empresa, no la Auditoría global del menú lateral (que también se llama así).
    const ficha = new URL(page.url()).pathname.match(/^\/platform\/tenants\/[^/]+/)?.[0];
    expect(ficha).toBeTruthy();
    await page.goto(`${ficha}/auditoria`);
    await expect(page.getByText("Estado de las cadenas")).toBeVisible();
    await capturar(page, info, "plataforma-empresa-auditoria");
  });
});
