import { expect, test } from "@playwright/test";
import { entrar } from "./sesion";
import { ocultarIndicadorDev } from "./indicador-dev";
import { abrirMenuUsuario } from "./menu-usuario";

import { capturarConfiguracion, prepararConfiguracionTest } from "./configuracion-v11-fixture";

test.beforeAll(prepararConfiguracionTest);

test("tarjetas abren grupos y el teléfono vuelve por la jerarquía", async ({ page }, info) => {
  await ocultarIndicadorDev(page);
  await entrar(page);
  await page.goto("/configuracion");
  for (const [id, etiqueta] of [["empresa", "Empresa"], ["personas-acceso", "Personas y acceso"], ["modulos", "Módulos"], ["uso-registros", "Uso y registros"]] as const) {
    await page.goto(`/configuracion/grupo/${id}`);
    await expect(page.getByRole("heading", { name: etiqueta, exact: true })).toBeVisible();
    await page.goto("/configuracion");
    await page.locator(`main a[href="/configuracion/grupo/${id}"]`).filter({ visible: true }).click();
    await expect(page).toHaveURL(new RegExp(`/configuracion/grupo/${id}$`));
    await expect(page.getByRole("heading", { name: etiqueta, exact: true })).toBeVisible();
    await page.goto("/configuracion");
  }
  await page
    .locator('main a[href="/configuracion/grupo/operacion"]')
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/configuracion\/grupo\/operacion$/);
  await expect(page.getByRole("heading", { name: "Operación", exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: /Calendario/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/configuracion\/calendario$/);
  if (info.project.name === "telefono") {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByRole("link", { name: "Volver a Operación", exact: true }).click();
    await expect(page).toHaveURL(/\/configuracion\/grupo\/operacion$/);
    await page.getByRole("link", { name: "Volver a Configuración", exact: true }).click();
    await expect(page).toHaveURL(/\/configuracion$/);
  }
  await page.goto("/configuracion");
  await page
    .locator('main a[href="/configuracion/grupo/agentes"]')
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/configuracion\/grupo\/agentes$/);
  const lista = page.getByRole("navigation", { name: "Entradas de Agentes", exact: true });
  await expect(lista.getByRole("link")).toHaveText([
    /Agentes y API keys/,
    /Aprobaciones pendientes/,
    /Agente interno/,
  ]);
  await page.goto("/configuracion/modulo/agente");
  await expect(page).toHaveURL(/\/configuracion\/grupo\/agentes\/agente-interno$/);
  await expect(page.getByRole("heading", { name: "Agente interno", exact: true })).toBeVisible();
  await page.goto("/configuracion/grupo/modulos");
  await expect(
    page
      .getByRole("navigation", { name: "Entradas de Módulos", exact: true })
      .getByRole("link", { name: /Agente interno/ }),
  ).toHaveCount(0);
});

test("Más excluye la barra y la cuenta; Preferencias queda en Más", async ({ page }, info) => {
  test.skip(info.project.name !== "telefono", "Barra móvil");
  await ocultarIndicadorDev(page);
  await entrar(page);
  await page.goto("/mi-cuenta/preferencias");
  const nav = page
    .getByRole("navigation", { name: "Principal", exact: true })
    .filter({ visible: true });
  await expect(nav.getByRole("link", { name: "Bandeja", exact: true })).toBeVisible();
  const nombres = await nav
    .getByRole("link")
    .evaluateAll((links) => links.map((a) => a.getAttribute("aria-label")));
  expect(nombres).toEqual(expect.arrayContaining(["Inicio", "Personas", "Bandeja"]));
  await expect(nav.getByRole("button", { name: "Más opciones" }).locator("svg")).toHaveClass(
    /text-accent/,
  );
  await nav.getByRole("button", { name: "Más opciones" }).click();
  const mas = page.getByRole("dialog", { name: "Más", exact: true });
  for (const nombre of [...nombres, "Mi cuenta", "Preferencias", "Cerrar sesión"]) {
    if (nombre) await expect(mas.getByRole("button", { name: nombre, exact: true })).toHaveCount(0);
  }
  await page.keyboard.press("Escape");
  await expect(nav.getByRole("button", { name: "Más opciones" })).toBeFocused();
});

test("evidencia de navegación clara y oscura", async ({ page }, info) => {
  await ocultarIndicadorDev(page);
  await entrar(page);
  if (info.project.name === "telefono") await page.setViewportSize({ width: 375, height: 667 });
  for (const tema of ["light", "dark"]) {
    await page.goto("/configuracion");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    for (const [nombre, ruta] of [
      ["portada", "/configuracion"],
      ["operacion", "/configuracion/grupo/operacion"],
      ["agentes", "/configuracion/grupo/agentes"],
      ["404", "/configuracion/grupo/noexiste"],
    ]) {
      await page.goto(ruta!);
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
      if (nombre === "404") {
        await expect(
          page.getByRole("heading", { name: "Este ajuste no existe", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(
            "Revisa la dirección «/configuracion/grupo/noexiste» o vuelve a Configuración.",
          ),
        ).toBeVisible();
        await page.locator("main").getByRole("link", { name: "Volver a Configuración", exact: true }).click();
        await expect(page).toHaveURL(/\/configuracion$/);
        await page.goto(ruta!);
      }
      await expect(page.locator("main")).toBeVisible();
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
      await capturarConfiguracion(page, nombre!, tema, info.project.name);
    }
    await page.goto("/configuracion");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await capturarConfiguracion(page, "portada", tema, info.project.name);
    if (info.project.name !== "telefono") await page.getByRole("navigation", { name: "Principal", exact: true }).filter({ visible: true }).screenshot({ path: `../../docs/2.0/qa/configuracion-v11-navegacion/sidebar-${tema}-${info.project.name}.png` });
    const cuenta = page.getByRole("menuitem", { name: "Mi cuenta", exact: true });
    await abrirMenuUsuario(page, cuenta);
    await expect(cuenta.locator("svg circle")).toHaveCount(1);
    await expect(page.getByRole("menuitem", { name: /^Preferencias/ }).locator("svg circle")).toHaveCount(1);
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await capturarConfiguracion(page, "usuario", tema, info.project.name);
    await page.keyboard.press("Escape");
    if (info.project.name === "telefono") {
      await page.getByRole("button", { name: "Más opciones" }).click();
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
      await capturarConfiguracion(page, "mas", tema, info.project.name);
      await page.keyboard.press("Escape");
    }
  }
});
