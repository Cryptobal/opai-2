import { expect, type Page } from "@playwright/test";

const RESUMEN = /^(\d+) novedad(?:es)? sin leer$|^Estás al día/;

async function pendientes(page: Page): Promise<number> {
  const texto = (await page.getByText(RESUMEN).first().textContent()) ?? "";
  return Number(/^(\d+)/.exec(texto)?.[1] ?? 0);
}

/** Marca todas las novedades pendientes en desktop (comparte estado con teléfono e iPad). */
export async function marcarPendientesDesktop(page: Page): Promise<void> {
  await page.goto("/novedades");
  await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
  const filtroNovedades = page.getByRole("group", { name: "Filtrar novedades" });
  await filtroNovedades.getByRole("button", { name: "Todas" }).click();
  const marcarTodasBtn = () => page.getByRole("button", { name: "Marcar todas como leídas" });
  if (await marcarTodasBtn().isVisible()) {
    await marcarTodasBtn().click();
    await expect(page.getByText("No pudimos marcar las novedades como leídas")).toHaveCount(0);
    await expect.poll(() => pendientes(page), { timeout: 30_000 }).toBe(0);
  } else if ((await pendientes(page)) > 0) {
    await page.getByRole("button", { name: "Marcar como leída" }).first().click();
    await expect.poll(() => pendientes(page), { timeout: 15_000 }).toBe(0);
  }

  await page.goto("/novedades");
  await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
  await filtroNovedades.getByRole("button", { name: "Todas" }).click();
  await expect.poll(async () => {
    const resumen = (await page.getByText(RESUMEN).first().textContent()) ?? "";
    if (/^Estás al día/.test(resumen)) return true;
    const marcar = marcarTodasBtn();
    if (await marcar.isVisible()) await marcar.click();
    return /^Estás al día/.test((await page.getByText(RESUMEN).first().textContent()) ?? "");
  }, { timeout: 45_000 }).toBe(true);
  await expect(page.getByText(/^Estás al día/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como leída" })).toHaveCount(0);
}