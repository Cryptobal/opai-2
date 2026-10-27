import { expect, test } from "@playwright/test";
import { entrar } from "./sesion";

test("etiquetas completas en riel y barra", async ({ page }, info) => {
  test.skip(info.project.name !== "telefono", "Los dos anchos se prueban en este proyecto");
  await entrar(page);
  await page.goto("/configuracion/preferencias");
  await page.getByRole("radio", { name: /^Personas/ }).click();
  await expect(page.getByRole("radio", { name: /^Personas/ })).toHaveAttribute("data-state", "checked");
  const nav = page.getByRole("navigation", { name: "Principal", exact: true }).filter({ visible: true });
  const cargo = nav.getByRole("link", { name: "Cargos y sueldos", exact: true });
  await expect(cargo).toContainText("Cargos y sueldos");
  await expect.poll(() => cargo.locator("span").last().evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.getByRole("radio", { name: /^Según mi rol/ }).click();
  await page.setViewportSize({ width: 768, height: 900 });
  for (const nombre of ["Instalaciones", "Configuración"]) {
    const enlace = nav.getByRole("link", { name: nombre, exact: true });
    await expect(enlace).toContainText(nombre);
    await expect.poll(() => enlace.locator("span").last().evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  }
});
