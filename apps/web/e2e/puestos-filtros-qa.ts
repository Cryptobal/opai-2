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
  // En dev la ficha puede volver a pintarse mientras compila: si el clic cae en ese momento no navega,
  // así que se reintenta hasta llegar a la pestaña (CAR-60).
  await expect(async () => {
    await page.getByRole("link", { name: /Puestos/i }).first().click({ timeout: 2_000 });
    await expect(page).toHaveURL(new RegExp(`/instalaciones/${id}/puestos`), { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
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
  // Los chips de la lista (Cuenta, Estado, Región) se montan tras hidratar: se espera a que estén para
  // que la foto «antes» no difiera de la de «después» solo por eso (CAR-60).
  if (proyecto !== "telefono") await expect(lista.getByText("Región", { exact: true })).toBeVisible();
  const antes = proyecto === "telefono" ? "" : await lista.innerText();
  // Un `fill` antes de que el buscador hidrate no llega a la URL: se repite hasta que `pq` aparece.
  await expect(async () => {
    await buscador.fill("Guardia posición 1");
    await expect(page).toHaveURL(/pq=Guardia/, { timeout: 4_000 });
  }).toPass({ timeout: 40_000 });
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
    await page.getByRole("banner").getByRole("link", { name: "Volver a Instalaciones", exact: true }).click();
    await expect(page).toHaveURL(/\/instalaciones\?/);
    await expect(page).toHaveURL(/q=Planta/);
    await expect(page).toHaveURL(/estado=activa/);
    await expect(page).not.toHaveURL(/pq=/);
  }
}
