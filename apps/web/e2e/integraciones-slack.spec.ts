import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Slack F1 (CAR-291, ADR-093): pantalla Configuración › Integraciones › Slack. Corre en `preview-e2e` con
// el usuario de `qa-e2e`. Nunca conecta un Slack real: en la vista previa la app de Slack no está
// registrada, así que se prueba la configuración de avisos y los mensajes de vuelta del OAuth.
test.describe("@preview configuración: integración con Slack", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("muestra la conexión y guarda la configuración mínima de avisos", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/integraciones/slack");
    await expect(page.getByRole("heading", { name: "Slack", exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/Conectar con Slack|todavía no está disponible aquí/).first(),
    ).toBeVisible();
    await expect(page.getByText("Qué se avisa")).toBeVisible();
    await expect(page.getByRole("switch", { name: /^Atraso/ })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "slack-inicio");

    // Cambia el margen, guarda, comprueba y deja el valor por defecto (15) para no ensuciar qa-e2e.
    const margen = page.getByLabel("Margen de atraso (minutos)");
    await margen.fill("20");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await expect(page.getByText("Configuración de Slack guardada")).toBeVisible({
      timeout: 30_000,
    });
    await page.reload();
    await expect(page.getByLabel("Margen de atraso (minutos)")).toHaveValue("20");
    await capturar(page, info, "slack-guardado");
    await page.getByLabel("Margen de atraso (minutos)").fill("15");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await expect(page.getByText("Configuración de Slack guardada")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("explica en palabras simples por qué no se conectó", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/integraciones/slack?slack=error&motivo=cancelado");
    await expect(page.getByText("No se pudo conectar Slack")).toBeVisible();
    await expect(
      page.getByText("Cancelaste la instalación en Slack. No se conectó nada."),
    ).toBeVisible();
    await capturar(page, info, "slack-error");
    // Un motivo desconocido nunca se muestra tal cual.
    await page.goto("/configuracion/integraciones/slack?slack=error&motivo=texto-inventado");
    await expect(page.getByText("texto-inventado")).toHaveCount(0);
  });
});
