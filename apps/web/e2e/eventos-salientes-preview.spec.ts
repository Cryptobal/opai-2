import { expect, test } from "@playwright/test";

import { capturar, capturarHoja } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-352 (Sesión Núcleo): eventos salientes en Configuración › Agentes y API keys. Corre con la
// empresa ficticia de QA: agrega un destino a una dirección de prueba, mira su ficha y lo elimina.
test.describe("@preview eventos salientes", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("lista, agregar destino, secreto una vez, ficha y eliminar", async ({ page }, info) => {
    test.setTimeout(240_000);
    await entrar(page);
    await page.goto("/configuracion/agentes/eventos");
    await expect(page.getByRole("heading", { name: "Eventos salientes" }).first()).toBeVisible({
      timeout: 60_000,
    });
    await capturar(page, info, "eventos-salientes-lista");

    await page.goto("/configuracion/agentes/eventos?crear=1");
    // Por rol: «Dirección» también aparece en el texto de algunos eventos de la lista.
    const url = page.getByRole("textbox", { name: "Dirección", exact: true });
    await expect(url).toBeVisible({ timeout: 60_000 });
    // Dirección única por corrida: preview-e2e corre varios tamaños en paralelo y cada uno borra el suyo.
    const direccion = `https://hooks.qa-e2e.test/opai-${info.project.name}-${Date.now()}`;
    await url.fill(direccion);
    await page.getByLabel("Buscar evento").fill("core.cuenta.creada");
    const casilla = page.getByRole("checkbox", { name: /core\.cuenta\.creada/ });
    await casilla.click();
    await expect(casilla).toBeChecked();
    await capturarHoja(page, info, "eventos-salientes-agregar");
    await page.getByRole("button", { name: "Agregar destino" }).last().click();

    const dialogo = page.getByRole("dialog", { name: "Destino agregado" });
    await expect(dialogo).toBeVisible({ timeout: 60_000 });
    await expect(dialogo.getByText(/^whsec_/)).toBeVisible();
    await capturarHoja(page, info, "eventos-salientes-secreto");
    await dialogo.getByRole("button", { name: "Ya lo copié" }).click();

    try {
      await page.getByRole("link", { name: direccion, exact: true }).click();
      await expect(page.getByText("Eventos suscritos (1)")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText("Aún no hay entregas")).toBeVisible();
      await capturar(page, info, "eventos-salientes-ficha");
    } finally {
      // Limpieza: el destino de prueba no queda activo en la empresa de QA.
      await page.getByRole("button", { name: "Eliminar" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
      await expect(page).toHaveURL(/\/configuracion\/agentes\/eventos$/, { timeout: 60_000 });
    }
  });
});
