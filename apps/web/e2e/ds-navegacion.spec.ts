import { expect, test } from "@playwright/test";

test("las muestras diferidas del shell conservan acordeón, fijados, área principal y bandas", async ({ page }, info) => {
  await page.goto("/ds");
  const muestra = page.locator("section").filter({ has: page.getByRole("heading", {
    name: "Navegación por áreas · acordeón, fijados y área principal", exact: true,
  }) });
  await muestra.scrollIntoViewIfNeeded();
  const clientes = muestra.getByRole("button", { name: "Clientes", exact: true });
  await expect(clientes).toHaveAttribute("aria-expanded", "true");
  await clientes.click();
  await expect(clientes).toHaveAttribute("aria-expanded", "false");
  await clientes.click();
  await muestra.getByRole("button", { name: "Fijar", exact: true }).click();
  await expect(muestra.getByRole("link", { name: "Cuentas", exact: true })).toBeVisible();
  await muestra.getByRole("link", { name: "Cuentas", exact: true }).locator("..").getByRole("button", { name: "Desfijar", exact: true }).click();
  await expect(muestra.getByRole("link", { name: "Cuentas", exact: true })).toHaveCount(0);
  await muestra.getByRole("radio", { name: /^Personas/ }).click();
  await expect(muestra.getByRole("radio", { name: /^Personas/ })).toHaveAttribute("data-state", "checked");
  await expect(page.getByRole("button", { name: "Actualizar", exact: true })).toBeAttached();
  await expect(page.getByRole("button", { name: "Instalar", exact: true })).toBeAttached();
  await muestra.screenshot({ path: info.outputPath("muestra-navegacion.png") });
});
