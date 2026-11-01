import { expect, test } from "@playwright/test";

import { ocultarIndicadorDev } from "./indicador-dev";
import { crearNegocio } from "./negocios-ayuda";
import { entrar } from "./sesion";

test.setTimeout(180_000);

test("kanban: deslizar con el dedo, mantener para mover y vacío compacto", async ({
  page,
  context,
}, info) => {
  await ocultarIndicadorDev(page);
  await entrar(page);
  if (info.project.name === "telefono") await page.setViewportSize({ width: 390, height: 844 });
  const titulo = `Negocio ficticio CAR-130 ${info.project.name} ${Date.now()}`;
  await crearNegocio(page, titulo, ["Planta Quilicura"]);
  await page.goto("/negocios");
  const tablero = page.locator("#columnas-tablero");
  await expect(tablero).toBeVisible();
  const caja = await tablero.boundingBox();
  if (!caja) throw new Error("No se encontró el tablero");
  const ancho = await tablero.evaluate((e) => ({ total: e.scrollWidth, visible: e.clientWidth }));
  expect(ancho.total).toBeGreaterThan(ancho.visible);
  if (info.project.name === "telefono") {
    const cdp = await context.newCDPSession(page);
    const y = Math.min(caja.y + 100, 600);
    const tocar = (type: "touchStart" | "touchMove" | "touchEnd", x: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });
    await tocar("touchStart", 340);
    for (let x = 320; x >= 40; x -= 20) {
      await tocar("touchMove", x);
      await page.waitForTimeout(20);
    }
    await tocar("touchEnd", 40);
    await expect.poll(() => tablero.evaluate((e) => e.scrollLeft)).toBeGreaterThan(100);
    await tablero.evaluate((e) => e.scrollTo({ left: 0, behavior: "instant" }));
    const tarjeta = page.getByRole("article", { name: titulo });
    await tarjeta.scrollIntoViewIfNeeded();
    const rect = await tarjeta.boundingBox();
    if (!rect) throw new Error("Falta tarjeta ficticia");
    const inicio = { x: rect.x + 80, y: rect.y + rect.height - 15 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [inicio] });
    await page.waitForTimeout(500);
    await expect(tarjeta).toHaveAttribute("aria-grabbed", "true");
    // Acercarse al borde desplaza el tablero mientras se mantiene la tarjeta.
    for (let i = 0; i < 18; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 370, y: inicio.y + (i % 2) }],
      });
      await page.waitForTimeout(30);
      if ((await page.locator("[data-etapa]").nth(1).getAttribute("data-sobre")) !== null) break;
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(
      page.locator("[data-etapa]").nth(1).getByRole("article", { name: titulo }),
    ).toBeAttached();
  } else {
    await page.getByRole("article", { name: titulo }).dragTo(page.locator("[data-etapa]").nth(1));
    await expect(
      page.locator("[data-etapa]").nth(1).getByRole("article", { name: titulo }),
    ).toBeAttached();
  }
  const vacio = page
    .getByRole("status", { includeHidden: true })
    .filter({ hasText: /^Sin negocios$/ })
    .first();
  await expect(vacio).toBeAttached();
  if (info.project.name === "telefono") {
    const altura = await vacio.evaluate((e) => e.getBoundingClientRect().height);
    expect(altura).toBeLessThan(100);
  }
  if (info.project.name === "telefono") {
    await vacio.evaluate((e) =>
      e
        .closest("[data-etapa]")
        ?.scrollIntoView({ block: "nearest", inline: "start", behavior: "instant" }),
    );
    await expect(vacio).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath("kanban.png") });
  if (info.project.name === "telefono") {
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
    await page.screenshot({ path: info.outputPath("kanban-375.png") });
  }
});
