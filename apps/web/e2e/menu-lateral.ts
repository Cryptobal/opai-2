import { expect, type Page } from "@playwright/test";

/** Enlace del menú principal (barra lateral, riel o barra inferior) por su nombre accesible. */
export const menu = (page: Page, nombre: RegExp) =>
  page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: nombre });

const GRUPO = { Personas: "Personas", Cuentas: "Clientes" } as const;

/**
 * El menú lateral es un acordeón: si el enlace está en un grupo cerrado, se abre antes del clic.
 * Plegado, el grupo queda `inert` y `aria-hidden`, así que su enlace no existe para `getByRole`. Todo
 * se reintenta hasta que el enlace aparezca: justo después de una navegación del lado del cliente
 * (entrar o elegir empresa) la URL ya cambió pero el menú puede no estar montado, y un `count()`
 * instantáneo daría 0 y saltaría la apertura del grupo; antes de hidratar, el clic al grupo no hace
 * nada.
 */
export async function ir(page: Page, destino: keyof typeof GRUPO) {
  const nav = page.getByRole("navigation", { name: "Principal" });
  const grupo = nav.getByRole("button", { name: GRUPO[destino], exact: true });
  const enlace = menu(page, new RegExp(`^${destino}`));
  await expect(async () => {
    if ((await grupo.count()) > 0 && (await grupo.getAttribute("aria-expanded")) !== "true") {
      await grupo.click({ timeout: 1_000 });
    }
    await expect(enlace).toBeVisible({ timeout: 1_000 });
    // También el clic: las preferencias (diferidas) pueden plegar el grupo justo después de abrirlo.
    await enlace.click({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}
