import { expect, type Locator } from "@playwright/test";

import { hidratado } from "./hidratacion";

/**
 * Despliega un área del riel (iPad y escritorio) si está plegada. Solo se abre sola el área de la
 * página actual, y la preferencia de área abierta se guarda por usuario, así que otras specs pueden
 * dejarla plegada. Reintenta hasta verla abierta: en dev el primer clic puede perderse.
 */
export async function abrirArea(nav: Locator, area: string) {
  // Recién entrado, el riel puede no estar montado: sin esperar, `count()` daba 0 y no se abría.
  await expect(nav.first()).toBeVisible({ timeout: 30_000 });
  await expect(nav.first().getByRole("link", { name: "Inicio" }).first()).toBeAttached({
    timeout: 30_000,
  });
  const boton = nav.getByRole("button", { name: area, exact: true });
  if (!(await boton.count())) return;
  await hidratado(boton);
  await expect(async () => {
    if ((await boton.getAttribute("aria-expanded")) !== "true") await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "true", { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}
