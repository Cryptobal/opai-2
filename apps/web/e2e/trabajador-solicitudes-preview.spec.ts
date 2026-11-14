import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Portal del trabajador · Solicitudes (CAR-464) en `preview-e2e`: la pantalla carga sin errores desde «Más», con la
// lista o el estado vacío, y la hoja «Pedir permiso o vacaciones» abre con sus campos (no envía: no deja datos). Si el
// usuario de `qa-e2e` no tiene ficha de trabajador, se anota como omitido. A 375, 1024 y 1280 px.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

const SIN_PORTAL = /Tu cuenta aún no tiene una ficha|Portal no disponible en tu empresa|No tienes acceso a este portal/;

test.describe("@preview trabajador solicitudes", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Solicitudes carga y abre la hoja para pedir", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/trabajador/solicitudes");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const pedir = page.getByRole("button", { name: "Pedir permiso o vacaciones" });
    const sinPortal = page.getByText(SIN_PORTAL);
    await expect(pedir.or(sinPortal).first()).toBeVisible();
    if (!(await pedir.count())) {
      info.annotations.push({ type: "omitido", description: `qa-e2e: ${(await sinPortal.first().textContent()) ?? "sin portal"}` });
      expect(errores).toEqual([]);
      return;
    }
    await capturar(page, info, "trabajador-solicitudes");
    // En `next dev` el botón se pinta antes de hidratarse y un clic en esa ventana se pierde.
    await hidratado(pedir);
    await pedir.click();
    const hoja = page.getByRole("dialog");
    await expect(hoja.getByText("Qué necesitas")).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Enviar solicitud" })).toBeDisabled();
    await capturar(page, info, "trabajador-solicitudes-pedir");
    expect(errores).toEqual([]);
  });
});
