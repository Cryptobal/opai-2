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
  const filtro = page.getByRole("group", { name: "Filtrar novedades" });
  await filtro.getByRole("button", { name: "Todas" }).click();
  const marcarTodas = page.getByRole("button", { name: "Marcar todas como leídas" });
  if ((await pendientes(page)) > 0 && (await marcarTodas.isVisible())) {
    await marcarTodas.click();
    await expect(page.getByText("No pudimos marcar las novedades como leídas")).toHaveCount(0);
    await expect.poll(() => pendientes(page), { timeout: 30_000 }).toBe(0);
  }

  await page.goto("/novedades");
  await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => pendientes(page), { timeout: 30_000 }).toBe(0);
  await expect(page.getByText(/^Estás al día/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como leída" })).toHaveCount(0);
}