import { expect, type Page } from "@playwright/test";

import { entrar } from "./fixtures-puestos-car8";

export async function comprobarEstadoVisible(page: Page) {
  const detalle = page.getByRole("region", { name: "Detalle" });
  const filas = detalle.getByRole("row").filter({ hasText: /A Guardia rotativa|A Guardia retirada/ });
  const celdas = [detalle.getByRole("columnheader", { name: "Estado" })];
  for (const fila of await filas.all()) celdas.push(fila.getByRole("cell").last());
  for (const celda of celdas) {
    expect(await celda.evaluate((el) => {
      const contenedor = el.closest(".overflow-x-auto");
      return !!contenedor && el.getBoundingClientRect().right <= contenedor.getBoundingClientRect().right;
    })).toBe(true);
  }
}

export async function comprobarFiltrosPuestos(page: Page, id: string, proyecto: string) {
  await entrar(page);
  await page.goto("/instalaciones?q=Planta&estado=activa");
  await page.getByRole("link", { name: /Planta Quilicura/i }).first().click();
  await page.getByRole("link", { name: /Puestos/i }).first().click();
  await expect(page).toHaveURL(new RegExp(`/instalaciones/${id}/puestos`));
  await expect(page).toHaveURL(/estado=activa/);
  const detalle = page.getByRole("region", { name: "Detalle" });
  const buscador = detalle.getByPlaceholder("Nombre del puesto");
  await expect(buscador).toBeVisible();
  // El atajo «/» lo instala un useEffect: hasta que la página hidrata, la tecla no hace nada.
  await expect(async () => {
    await buscador.click();
    await buscador.blur();
    await expect(buscador).not.toBeFocused();
    await page.keyboard.press("/");
    await expect(buscador).toBeFocused({ timeout: 1_000 });
  }).toPass();
  const lista = page.getByRole("region", { name: /Lista de instalaciones/i });
  const antes = proyecto === "telefono" ? "" : await lista.innerText();
  await buscador.fill("Guardia posición 1");
  await expect(page).toHaveURL(/pq=Guardia/);
  await detalle.getByRole("button", { name: "Filtrar por estado" }).click();
  await page.getByRole("menuitem", { name: "Activo", exact: true }).click();
  await expect(page).toHaveURL(/pestado=activo/);
  if (proyecto !== "telefono") {
    await expect(lista).toHaveText(antes, { useInnerText: true });
    const estado = detalle.getByRole("columnheader", { name: "Estado" });
    await expect(estado).toBeVisible();
    const caja = await estado.boundingBox();
    expect(caja && caja.x + caja.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await estado.evaluate((el) => {
      const contenedor = el.closest(".overflow-x-auto");
      return !!contenedor && el.getBoundingClientRect().right <= contenedor.getBoundingClientRect().right;
    })).toBe(true);
  } else {
    await page.getByRole("banner").getByRole("link", { name: "Instalaciones", exact: true }).click();
    await expect(page).toHaveURL(/\/instalaciones\?/);
    await expect(page).toHaveURL(/q=Planta/);
    await expect(page).toHaveURL(/estado=activa/);
    await expect(page).not.toHaveURL(/pq=/);
  }
}
