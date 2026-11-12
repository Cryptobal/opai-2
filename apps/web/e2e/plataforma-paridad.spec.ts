import { expect, type Page, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-323: Usuarios de plataforma, Auditoría y Editar empresa. Corre en `preview-e2e` con el usuario de
// `qa-e2e`. Si ese usuario no tiene rol de plataforma (lo normal: el QA nunca ve otras empresas), las
// pruebas se omiten con el motivo; no se le da un rol de plataforma a la cuenta de QA desde aquí.
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
    // Solo la empresa ficticia de QA, nunca Gard.
    await page.goto("/platform?q=qa-e2e");
    const fila = page
      .getByRole("main")
      .getByText(/QA E2E/)
      .filter({ visible: true })
      .first();
    test.skip((await fila.count()) === 0, "La empresa qa-e2e no aparece en Plataforma");
    await fila.click();
    await page.getByRole("button", { name: "Acciones de la empresa" }).click();
    await page.getByRole("menuitem", { name: "Editar empresa" }).click();
    await page.getByLabel("Nombre").fill("QA E2E (ficticia) · revisión");
    await page.getByRole("button", { name: "Revisar cambios" }).click();
    await expect(page.getByText("Revisa antes de confirmar")).toBeVisible();
    await capturar(page, info, "plataforma-editar-empresa");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page
      .getByRole("tab", { name: "Auditoría" })
      .or(page.getByRole("link", { name: "Auditoría" }))
      .first()
      .click();
    await expect(page.getByText("Estado de las cadenas")).toBeVisible();
    await capturar(page, info, "plataforma-empresa-auditoria");
  });
});
