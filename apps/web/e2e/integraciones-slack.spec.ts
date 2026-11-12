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
    // Con «volver», la barra superior no muestra un encabezado «Slack» (migas en escritorio, oculta en
    // teléfono): se comprueba el contenido propio de la pantalla.
    await expect(page.getByText("Conexión", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/Conectar con Slack|todavía no está disponible aquí/).first(),
    ).toBeVisible();
    await expect(page.getByText("Qué se avisa")).toBeVisible();
    await expect(page.getByRole("switch", { name: /^Atraso/ })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "slack-inicio");

    // Cambia el margen y guarda. Los tres tamaños corren a la vez sobre la misma empresa de qa-e2e, así que
    // no se compara el valor tras recargar (lo cubren las pruebas de la capacidad): solo que se guarde.
    const valor = String(21 + ["telefono", "ipad", "desktop"].indexOf(info.project.name));
    await page.getByLabel("Margen de atraso (minutos)").fill(valor);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Configuración de Slack guardada").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Qué se avisa")).toBeVisible();
    await capturar(page, info, "slack-guardado");

    // Deja el valor por defecto (15) para no ensuciar qa-e2e. En teléfono el aviso anterior queda sobre
    // «Guardar» (sonner lo pausa con la emulación táctil), así que se envía con Enter desde el campo y se
    // comprueba la respuesta de la acción de servidor, no el aviso, que puede seguir en pantalla.
    const margen = page.getByLabel("Margen de atraso (minutos)");
    await margen.fill("15");
    const respuesta = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined,
    );
    await margen.press("Enter");
    const cuerpo = await (await respuesta).text();
    // La acción devuelve el Resultado de core.slack.configurar serializado en la respuesta RSC.
    expect(cuerpo).toContain('"ok":true');
    expect(cuerpo).not.toContain('"ok":false');
    await expect(page.getByRole("button", { name: "Guardar" })).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  });

  test("explica en palabras simples por qué no se conectó", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/integraciones/slack?slack=error&motivo=cancelado");
    await expect(page.getByText("No se pudo conectar Slack")).toBeVisible();
    await expect(
      page.getByText("Cancelaste la instalación en Slack. No se conectó nada."),
    ).toBeVisible();
    await expect(page.getByText("Qué se avisa")).toBeVisible();
    await capturar(page, info, "slack-error");
    // Un motivo desconocido nunca se muestra tal cual.
    await page.goto("/configuracion/integraciones/slack?slack=error&motivo=texto-inventado");
    await expect(page.getByText("No se pudo conectar Slack")).toBeVisible();
    await expect(page.getByText("texto-inventado")).toHaveCount(0);
  });
});
