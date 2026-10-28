import { expect, test } from "@playwright/test";
import { entrar } from "./sesion";
import { ocultarIndicadorDev } from "./indicador-dev";

test.beforeEach(async ({ page }) => ocultarIndicadorDev(page));

test("vencimientos conserva el origen y la campana abre avisos", async ({ page }) => {
  await entrar(page);
  await page.goto("/personas/vencimientos?origen=inicio");
  await expect(page.getByRole("button", { name: /^Vencen pronto/ })).toBeVisible();
  const volver = page.locator("header:visible").getByRole("link", { name: /Inicio/ });
  await volver.click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .locator("header:visible")
    .getByRole("button", { name: /Notificaciones/ })
    .click();
  await expect(page.getByText("Notificaciones", { exact: true }).last()).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Notificaciones" }).getByRole("link", { name: "Ver todo" }),
  ).toHaveAttribute("href", "/#bandeja");
});

test("Inicio y Vencimientos concuerdan y registran las vistas", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await entrar(page);
  await page.goto("/");
  await expect(page.getByText("Requiere tu decisión hoy")).toBeVisible();
  const enlace = page
    .locator('a[href="/personas/vencimientos?origen=inicio"]')
    .filter({ visible: true });
  const texto = (await enlace.count())
    ? await enlace.first().locator("xpath=ancestor::li").textContent()
    : null;
  const cifras = texto?.match(/(\d+) documentos? vencidos?.*?(\d+) vence[n]? pronto/);
  expect(cifras).not.toBeNull();
  expect(Number(cifras?.[1])).toBeGreaterThan(0);
  for (const tema of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `../../docs/2.0/design/fix-inicio-vencimientos/${info.project.name}-${tema}-inicio.png`,
      fullPage: true,
    });
    await page
      .locator("header:visible")
      .getByRole("button", { name: /Notificaciones/ })
      .click();
    await expect(page.getByText("Notificaciones", { exact: true }).last()).toBeVisible();
    await page.screenshot({
      path: `../../docs/2.0/design/fix-inicio-vencimientos/${info.project.name}-${tema}-campana.png`,
    });
    await page.keyboard.press("Escape");
  }
  await page.goto("/personas/vencimientos?origen=inicio");
  const volver = page.locator("header:visible").getByRole("link", { name: /Inicio/ });
  await expect(volver).toHaveAttribute("href", "/");
  const vencidos = page.getByRole("button", { name: /^Vencidos/ });
  const pronto = page.getByRole("button", { name: /^Vencen pronto/ });
  await expect(vencidos).toHaveText(new RegExp(`Vencidos\\s*${cifras?.[1] ?? "0"}$`));
  await expect(pronto).toHaveText(new RegExp(`Vencen pronto\\s*${cifras?.[2] ?? "0"}$`));
  for (const tema of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `../../docs/2.0/design/fix-inicio-vencimientos/${info.project.name}-${tema}-vencimientos.png`,
      fullPage: true,
    });
  }
  await volver.click();
  await expect(page).toHaveURL(/\/$/);
});
