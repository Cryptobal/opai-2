import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { ocultarIndicadorDev } from "./indicador-dev";
import { entrar } from "./sesion";

// CAR-127 · PR 3: 06 Editor de plantillas. Crear desde «Nueva plantilla», escribir con una variable
// que no existe (bloquea publicar), insertarla desde el panel, guardar el borrador y publicar la v2;
// a 1024 las variables van en una hoja y a 375 la plantilla es de solo lectura.
test.beforeEach(async ({ page }) => ocultarIndicadorDev(page));

test("crear, editar con variables, guardar borrador y publicar", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Recorre 1280, 1024 y 375 en un solo flujo.");
  test.setTimeout(120_000);
  await entrar(page);
  await page.goto("/documentos/plantillas");
  const nombre = `Contrato e2e ${Date.now()}`;
  const nueva = page.getByRole("button", { name: "Nueva plantilla" });
  await hidratado(nueva);
  await nueva.click();
  const dialogo = page.getByRole("dialog", { name: "Nueva plantilla" });
  await dialogo.getByLabel("Nombre").fill(nombre);
  await dialogo.getByRole("button", { name: "Crear y editar" }).click();
  await page.waitForURL(/\/documentos\/plantillas\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("main").getByRole("heading", { name: nombre })).toBeVisible();

  const texto = page.getByLabel("Texto de la plantilla");
  await hidratado(texto);
  await texto.fill("**Primero:** {persona.nombre} trabaja en la comuna {persona.comuna_obra}. RUT ");
  await expect(page.getByText("La variable {persona.comuna_obra} no existe")).toBeVisible();
  const publicar = page.getByRole("button", { name: "Publicar versión" });
  await expect(publicar).toBeDisabled();

  await texto.fill("**Primero:** {persona.nombre} trabaja como {vinculo.cargo}. RUT ");
  await texto.press("End");
  await page.getByRole("button", { name: /Insertar RUT/ }).first().click();
  await expect(texto).toHaveValue(/RUT \{persona\.rut\}$/);
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.locator("article").getByText("{vinculo.cargo}")).toBeVisible();

  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText("Guardaste el borrador.")).toBeVisible();
  await expect(publicar).toBeEnabled();
  await publicar.click();
  await expect(page.getByText("Publicaste la versión 2.")).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  const ver = page.getByRole("button", { name: "Ver variables" });
  await hidratado(ver);
  await ver.click();
  await expect(page.getByRole("dialog", { name: "Variables" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(page.getByText("Edita en un computador")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar versión" })).toBeHidden();
  await expect(page.locator("article").getByText("{persona.rut}")).toBeVisible();
});
