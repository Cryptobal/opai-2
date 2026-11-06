import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { entrar } from "./sesion";

// CAR-224: «Fijados y recientes» de «Más» (teléfono) no repite nombre ni destino.

async function abrirMas(page: Page) {
  const boton = page.getByRole("button", { name: "Más opciones" });
  await hidratado(boton);
  await boton.click();
  const hoja = page.getByRole("dialog");
  await expect(hoja).toBeVisible();
  return hoja;
}

test.describe("«Fijados y recientes» sin duplicados (CAR-224)", () => {
  test.beforeEach(({ viewport }) => test.skip((viewport?.width ?? 0) > 500, "solo teléfono"));

  test("en /solicitudes la tira no repite nombre ni destino y Editar sigue coherente", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/solicitudes");
    // El shell guarda la página actual como reciente; aprovecho su clave (usuario + empresa).
    await expect
      .poll(() => page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("opai_recientes_"))), {
        timeout: 15_000,
      })
      .toBe(true);
    // Estado que provocaba el fallo: la lista, su ficha (mismo título) y la ruta con barra final.
    await page.evaluate(() => {
      const clave = Object.keys(localStorage).find((k) => k.startsWith("opai_recientes_"));
      if (!clave) return;
      const mal = [
        { href: "/solicitudes", etiqueta: "Solicitudes" },
        { href: "/cotizaciones", etiqueta: "Cotizaciones" },
        { href: "/cotizaciones/00000000-0000-7000-8000-000000000001", etiqueta: "Cotizaciones" },
        { href: "/cotizaciones/", etiqueta: "Cotizaciones" },
        { href: "/personas", etiqueta: "Personas" },
      ];
      localStorage.setItem(clave, JSON.stringify(mal));
    });
    await page.reload();
    const hoja = await abrirMas(page);
    const tira = hoja.getByRole("region", { name: "Fijados y recientes" });
    await expect(tira.getByRole("link").first()).toBeVisible();
    const nombres = await tira.getByRole("link").evaluateAll((n) => n.map((a) => a.getAttribute("title") ?? a.textContent ?? ""));
    expect(new Set(nombres.map((t) => t.trim().toLowerCase())).size).toBe(nombres.length);
    const destinos = await tira.getByRole("link").evaluateAll((n) => n.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    expect(new Set(destinos).size).toBe(destinos.length);
    expect(nombres.filter((t) => /cotizaciones/i.test(t)).length).toBeLessThanOrEqual(1);
    // Editar muestra un botón de fijar o desfijar por acceso y Listo vuelve a la tira.
    await tira.getByRole("button", { name: "Editar" }).click();
    await expect(tira.getByRole("button", { name: /^(Fijar|Desfijar) / }).first()).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: info.outputPath("mas-sin-duplicados.png") });
    await tira.getByRole("button", { name: "Listo" }).click();
    await expect(tira.getByRole("link").first()).toBeVisible();
  });
});
