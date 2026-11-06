import { expect, type Locator, type Page } from "@playwright/test";

/** Abre el menú de usuario hasta ver `dentro`: un clic antes de hidratar no lo abre (CAR-60). */
export async function abrirMenuUsuario(page: Page, dentro: Locator) {
  // Solo dev: el indicador de Next («N Insight») queda sobre el menú de usuario del riel lateral.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await expect(async () => {
    if (!(await dentro.isVisible()))
      await page.getByRole("button", { name: "Menú de usuario" }).click({ timeout: 2_000 });
    await expect(dentro).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}
