import { expect, test } from "@playwright/test";
import { entrar } from "./sesion";

test("vencimientos conserva el origen y la campana abre avisos", async ({ page }, info) => {
  await entrar(page);
  await page.goto("/personas/vencimientos?origen=inicio");
  await expect(page.getByRole("button", { name: /^Vencen pronto/ })).toBeVisible();
  if (info.project.name === "telefono") {
    await page
      .getByRole("link", { name: "Inicio", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/$/);
  }
  await page
    .locator("header")
    .getByRole("button", { name: /Notificaciones/ })
    .click();
  await expect(page.getByText("Notificaciones", { exact: true }).last()).toBeVisible();
});
