import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Portal del trabajador · Mi pauta (CAR-462) en `preview-e2e`: la pantalla carga sin errores y muestra los turnos
// propios agrupados por semana, o el estado vacío; la navegación a las semanas siguientes funciona. El Inicio trae la
// tarjeta «Tu próximo turno». Si el usuario de `qa-e2e` no tiene ficha de trabajador (o no tiene el portal), se anota
// como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const SIN_PORTAL = /Tu cuenta aún no tiene una ficha|Portal no disponible en tu empresa|No tienes acceso a este portal|Tu ficha de persona/;

test.describe("@preview trabajador mi pauta", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Mi pauta carga, navega por semanas y el Inicio muestra el próximo turno", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/trabajador/mi-pauta");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const siguientes = page.getByRole("link", { name: "Siguientes" });
    const sinPortal = page.getByText(SIN_PORTAL);
    await expect(siguientes.or(sinPortal).first()).toBeVisible();
    if (!(await siguientes.count())) {
      const motivo = (await sinPortal.first().textContent()) ?? "sin pauta";
      info.annotations.push({ type: "omitido", description: `qa-e2e: ${motivo}` });
      await capturar(page, info, "trabajador-mi-pauta-sin-portal");
      expect(errores).toEqual([]);
      return;
    }
    // Con turnos se ven agrupados por semana; sin turnos, el estado vacío.
    await expect(
      page.getByRole("heading", { name: /^Semana del / }).first().or(page.getByText("No tienes turnos en estas semanas")),
    ).toBeVisible();
    await capturar(page, info, "trabajador-mi-pauta");
    await siguientes.click();
    await expect(page).toHaveURL(/\/trabajador\/mi-pauta\?desde=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole("link", { name: "Volver a hoy" })).toBeVisible();
    await capturar(page, info, "trabajador-mi-pauta-siguientes");
    await page.goto("/trabajador");
    await expect(page.getByText("Tu próximo turno")).toBeVisible();
    await capturar(page, info, "trabajador-inicio-proximo-turno");
    expect(errores).toEqual([]);
  });
});
