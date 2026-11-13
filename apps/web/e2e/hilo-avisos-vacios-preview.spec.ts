import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-360 y CAR-361 (Sesión Diseño): en el marco Hilo, la acción de un estado vacío se ve secundaria
// (el único primario queda en la cabecera) y los avisos informativos son neutros, sin azul. Corre en
// `preview-e2e` con el usuario de la empresa ficticia `qa-e2e`, que no tiene instalaciones.
const BASE = process.env["BASE_URL"] ?? "http://localhost:3000";
const FILL_CLARO = "rgb(240, 240, 238)";

test.describe("@preview piel Hilo: vacíos y avisos", () => {
  test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");

  test("el vacío ofrece su acción en secundario y el aviso informativo es neutro", async ({
    page,
    context,
  }, info) => {
    test.setTimeout(180_000);
    await context.addCookies([{ name: "opai_marco", value: "hilo", url: BASE }]);
    await entrar(page);

    await page.goto("/instalaciones");
    const vacio = page.locator(".ds-estado").filter({ hasText: "Aún no hay instalaciones" });
    await expect(vacio).toBeVisible({ timeout: 60_000 });
    const accion = vacio.locator(".ds-estado-accion").locator("a, button").first();
    await expect(accion).toBeVisible();
    const fondo = await accion.evaluate((el) => getComputedStyle(el).backgroundColor);
    const tinta = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--ds-fg").trim(),
    );
    expect(fondo).not.toBe(tinta);
    expect(fondo).not.toBe("rgb(13, 13, 14)");
    await capturar(page, info, "hilo-vacio-instalaciones");

    await page.goto("/configuracion/modulos");
    const aviso = page.getByText("Apagar un módulo no rompe otro", { exact: false }).first();
    await expect(aviso).toBeVisible({ timeout: 60_000 });
    const fondoAviso = await aviso.evaluate((el) => {
      let n: Element | null = el;
      while (n && getComputedStyle(n).backgroundColor === "rgba(0, 0, 0, 0)") n = n.parentElement;
      return n ? getComputedStyle(n).backgroundColor : "";
    });
    const oscuro = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
    if (!oscuro) expect(fondoAviso).toBe(FILL_CLARO);
    await capturar(page, info, "hilo-aviso-modulos");
  });
});
