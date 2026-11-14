import { expect, type Locator, type Page } from "@playwright/test";

/** Menú de usuario: avatar del diseño clásico o «Yo» de la barra inferior del diseño nuevo (CAR-335). */
export const USUARIO = /^(Menú de usuario|Yo)(,|$)/;

/** Abre el menú de usuario hasta ver `dentro`: un clic antes de hidratar no lo abre (CAR-60). */
export async function abrirMenuUsuario(page: Page, dentro: Locator) {
  // Solo dev: el indicador de Next («N Insight») queda sobre el menú de usuario del riel lateral.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await expect(async () => {
    if (!(await dentro.isVisible()))
      await page
        .getByRole("button", { name: USUARIO })
        .filter({ visible: true })
        .first()
        .click({ timeout: 2_000 });
    await expect(dentro).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}
