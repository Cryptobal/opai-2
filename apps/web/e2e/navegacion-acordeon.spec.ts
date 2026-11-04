import { expect, test } from "@playwright/test";
import { entrar } from "./sesion";
import { ocultarIndicadorDev } from "./indicador-dev";

test.use({ actionTimeout: 30_000 });

test("recuerda el área abierta en Inicio y Configuración", async ({ page }, info) => {
  test.skip(info.project.name === "telefono", "El acordeón lateral se muestra desde 1024 px");
  await ocultarIndicadorDev(page);
  await entrar(page);
  await page.goto("/configuracion");
  const nav = page.getByRole("navigation", { name: "Principal", exact: true }).filter({ visible: true });
  const personas = nav.getByRole("button", { name: "Personas", exact: true });
  const clientes = nav.getByRole("button", { name: "Comercial", exact: true });
  if ((await clientes.getAttribute("aria-expanded")) !== "true") await clientes.click();
  await expect(
    nav
      .locator('a[href="/cuentas"]')
      .last()
      .locator("..")
      .locator('button[aria-label="Fijar"], button[aria-label="Desfijar"]'),
  ).toBeAttached();
  const estabaAbierto = (await clientes.getAttribute("aria-expanded")) === "true";
  await clientes.click();
  await expect(clientes).toHaveAttribute("aria-expanded", String(!estabaAbierto));
  const guardado = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      !!r.request().postData()?.includes("navegacion_area_abierta") &&
      !!r.request().postData()?.includes('"personas"'),
  );
  await personas.click();
  expect((await guardado).ok()).toBe(true);
  await expect(personas).toHaveAttribute("aria-expanded", "true");
  await page.reload();
  await expect(personas).toHaveAttribute("aria-expanded", "true");
  await page.goto("/");
  await expect(personas).toHaveAttribute("aria-expanded", "true");
  await page.reload();
  await expect(personas).toHaveAttribute("aria-expanded", "true");
});

test("al navegar solo queda abierta el área de la ruta", async ({ page }, info) => {
  test.skip(info.project.name === "telefono", "El acordeón lateral se muestra desde 1024 px");
  await ocultarIndicadorDev(page);
  await entrar(page);
  await page.goto("/mi-cuenta/preferencias");
  await page.getByRole("radio", { name: /^Según mi rol/ }).click();
  await page.goto("/cuentas");
  const nav = page.getByRole("navigation", { name: "Principal", exact: true }).filter({ visible: true });
  const clientes = nav.getByRole("button", { name: "Comercial", exact: true });
  const personas = nav.getByRole("button", { name: "Personas", exact: true });
  await expect(clientes).toHaveAttribute("aria-expanded", "true");
  await expect(personas).toHaveAttribute("aria-expanded", "false");
  await nav.getByRole("link", { name: "Personas", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/personas$/);
  await expect(personas).toHaveAttribute("aria-expanded", "true");
  await expect(clientes).toHaveAttribute("aria-expanded", "false");
  await expect(nav.locator('button[aria-expanded="true"]')).toHaveCount(1);
});
