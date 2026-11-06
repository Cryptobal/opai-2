import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { entrar } from "./sesion";
import { sinDesborde, irANuevaCotizacion } from "./negocios-ayuda";

const numeros: Record<string, number> = { telefono: 1, ipad: 2, desktop: 3 };
test.setTimeout(180_000);
test.beforeAll(() => {
  execFileSync("pnpm", ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-cpq-e2e.ts"], {
    cwd: new URL("../../..", import.meta.url),
    env: process.env,
    stdio: "inherit",
  });
});

test("crea desde negocio abierto con vista previa y aparece en ambas listas", async ({
  page,
}, info) => {
  const numero = numeros[info.project.name] ?? 1;
  const negocio = `00000000-0000-7000-8000-00000000132${numero}`;
  const titulo = `Cotización ficticia ${info.project.name} ${Date.now()}`;
  await entrar(page, "cpq-gestor@example.test");
  await page.goto(`/negocios/${negocio}`);
  await irANuevaCotizacion(page);
  await expect(page.getByRole("button", { name: "Revisar cotización" })).toBeDisabled();
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  await page.getByLabel("Válida hasta").fill("2020-01-01");
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await expect(page.getByText("«Válida hasta» no puede ser anterior a hoy.")).toBeVisible();
  await page.getByLabel("Válida hasta").fill("");
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await expect(page.getByText(/Se creará CPQ-\d{4}-\d+/)).toBeVisible();
  await expect(page.getByLabel("Título", { exact: true })).toBeDisabled();
  await sinDesborde(page);
  await page.screenshot({ path: info.outputPath("cpq-preview.png"), fullPage: true });
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
  await page.goto("/cotizaciones");
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toContainText(/Borrador|Incompleta/);
  await sinDesborde(page);
  await page.screenshot({ path: info.outputPath("cpq-lista.png"), fullPage: true });
  await page.goto(`/negocios/${negocio}/cotizaciones`);
  // La pestaña del negocio antepone el código al título («CPQ-… · título»).
  await expect(page.getByText(titulo).filter({ visible: true })).toBeVisible();
  await sinDesborde(page);
  await page.screenshot({ path: info.outputPath("cpq-negocio.png"), fullPage: true });
});

test("desde lista elige un negocio abierto; editar invalida la vista previa", async ({
  page,
}, info) => {
  await entrar(page, "cpq-gestor@example.test");
  await page.goto("/cotizaciones/nueva");
  const selector = page.getByRole("button", { name: "Negocio abierto", exact: true });
  // Un clic antes de hidratar se pierde y el buscador no se abre (servidor de desarrollo compilando).
  await hidratado(selector);
  await selector.click();
  await page
    .getByRole("combobox")
    .last()
    .fill(`Negocio ficticio CPQ ${numeros[info.project.name] ?? 1}`);
  await page
    .getByRole("option", { name: /Negocio ficticio CPQ/ })
    .first()
    .click();
  await page.getByLabel("Título", { exact: true }).fill("Alternativa ficticia");
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await expect(page.getByRole("button", { name: "Confirmar creación" })).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar creación" })).toHaveCount(0);
  await expect(page.getByLabel("Título", { exact: true })).toBeEnabled();
  const titulo = `Desde lista ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
  await page.goto("/cotizaciones");
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
});

test("sin lectura no muestra entrada ni pestaña; lector no puede crear", async ({ page }) => {
  await entrar(page, "cpq-sin-lectura@example.test");
  await page.goto("/cotizaciones");
  await expect(page.getByText("No tienes acceso a esta sección")).toBeVisible();
  await expect(page.locator('nav a[href="/cotizaciones"]')).toHaveCount(0);
  await page.goto("/negocios/00000000-0000-7000-8000-000000001321");
  await expect(page.getByRole("link", { name: "Cotizaciones", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nueva cotización", exact: true })).toHaveCount(0);
  await page.context().clearCookies();
  await entrar(page, "cpq-lector@example.test");
  await page.goto("/cotizaciones");
  await expect(page.getByRole("link", { name: "Nueva cotización", exact: true })).toHaveCount(0);
  await page.goto("/cotizaciones/nueva");
  await expect(page.getByText("No tienes acceso a esta sección")).toBeVisible();
});
