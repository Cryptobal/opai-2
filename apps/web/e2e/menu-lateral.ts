import { expect, type Page } from "@playwright/test";

/** Enlace del menú principal (barra lateral, riel o barra inferior) por su nombre accesible. */
export const menu = (page: Page, nombre: RegExp) =>
  page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: nombre });

const GRUPO = { Personas: "Personas", Cuentas: "Clientes" } as const;

/**
 * El menú lateral es un acordeón: si el enlace está en un grupo cerrado, se abre antes del clic. Se
 * decide por `aria-expanded` del grupo y no por la visibilidad del enlace: plegado, el enlace sigue
 * midiendo 44 px (lo recorta el grid en 0fr) y antes de hidratar el clic al grupo no hace nada, así
 * que se reintenta hasta que quede abierto.
 */
export async function ir(page: Page, destino: keyof typeof GRUPO) {
  const grupo = page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("button", { name: GRUPO[destino], exact: true });
  if ((await grupo.count()) > 0) {
    await expect(async () => {
      if ((await grupo.getAttribute("aria-expanded")) !== "true") await grupo.click();
      await expect(grupo).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
  }
  await menu(page, new RegExp(`^${destino}`)).click();
}
