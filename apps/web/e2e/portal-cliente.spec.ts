import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Brief 16 · Portal Cliente PR 1 (CAR-88): configuración del portal y gestión de accesos en el ERP,
// y la puerta fail-closed del portal del cliente. Evidencia a 375, 1024 y 1280 px (proyectos de
// playwright.config). El tenant de dev tiene el módulo activo (seed:dev-tenant).
test.setTimeout(180_000);

test.describe("Portal Cliente · PR 1", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("configuración: tarjetas, guardar y persistencia, sin desborde horizontal", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/portal_cliente");
    await expect(page.getByText("Documentos visibles para el cliente")).toBeVisible();
    await expect(page.getByText("Datos de los guardias · Ley 21.719")).toBeVisible();
    await expect(page.getByText("Destinatarios del informe mensual")).toBeVisible();
    await expect(page.getByText("Accesos de contactos")).toBeVisible();
    await page.screenshot({ path: info.outputPath("portal-cliente-config.png"), fullPage: true });
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(1);

    // Cambia el RUT en reportes y guarda; al recargar queda como se dejó.
    const rut = page.getByRole("switch", { name: "Incluir el RUT en los reportes descargables" });
    const antes = await rut.getAttribute("aria-checked");
    await rut.click();
    const respuesta = page.waitForResponse(
      (r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("portal_cliente.config.actualizar"),
    );
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    expect((await respuesta).ok()).toBe(true);
    await page.reload();
    await expect(
      page.getByRole("switch", { name: "Incluir el RUT en los reportes descargables" }),
    ).toHaveAttribute("aria-checked", antes === "true" ? "false" : "true");

    // Deja la configuración como estaba para no ensuciar la siguiente corrida (esperando el guardado).
    await page.getByRole("switch", { name: "Incluir el RUT en los reportes descargables" }).click();
    const restaurada = page.waitForResponse(
      (r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("portal_cliente.config.actualizar"),
    );
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    expect((await restaurada).ok()).toBe(true);
  });

  test("el portal del cliente es fail-closed: quien no es contacto no entra", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/cliente");
    await expect(page.getByText(/No tienes acceso a esta sección|No tienes acceso a este portal/i).first()).toBeVisible();
    await page.screenshot({ path: info.outputPath("portal-cliente-sin-acceso.png"), fullPage: true });
  });

  test("vincular contacto abre la hoja y explica qué falta si no hay candidatos", async ({ page }) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/portal_cliente");
    await page.getByRole("button", { name: "Vincular contacto" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/Invítalos primero|Contacto/).first()).toBeVisible();
  });
});
