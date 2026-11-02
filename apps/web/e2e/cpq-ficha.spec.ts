import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";
import { sinDesborde } from "./negocios-ayuda";

const numeros: Record<string, number> = { telefono: 1, ipad: 2, desktop: 3 };
test.setTimeout(180_000);
test.beforeAll(() => {
  execFileSync("pnpm", ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-cpq-e2e.ts"], {
    cwd: new URL("../../..", import.meta.url),
    env: process.env,
    stdio: "inherit",
  });
});

test("ficha CPQ muestra resumen en español y patrón lista+ficha", async ({ page }, info) => {
  const numero = numeros[info.project.name] ?? 1;
  const negocio = `00000000-0000-7000-8000-00000000132${numero}`;
  await entrar(page, "cpq-gestor@example.test");
  await page.goto(`/negocios/${negocio}`);
  await page.getByRole("link", { name: "Nueva cotización", exact: true }).click();
  const titulo = `Ficha visual ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/[^/?#]+$/);
  await expect(page.getByRole("heading", { name: /CPQ-/ }).first()).toBeVisible();
  await expect(page.getByText("Resumen", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Mano de obra").first()).toBeVisible();
  await expect(page.getByText("mano_obra")).toHaveCount(0);
  await sinDesborde(page);
  await page.screenshot({
    path: info.outputPath("cpq-ficha-resumen.png"),
    fullPage: true,
  });
});

test("muestra el error del servidor al dejar lista con costos pendientes", async ({ page }, info) => {
  const numero = numeros[info.project.name] ?? 1;
  const negocio = `00000000-0000-7000-8000-00000000132${numero}`;
  await entrar(page, "cpq-gestor@example.test");
  await page.goto(`/negocios/${negocio}`);
  await page.getByRole("link", { name: "Nueva cotización", exact: true }).click();
  const titulo = `Error costos ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/[^/?#]+$/);
  await page.getByRole("button", { name: "Agregar puesto" }).first().click();
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dejar lista" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Dejar lista" }).click();
  await expect(page.getByText("hay costos o UF pendientes")).toBeVisible();
  await sinDesborde(page);
});
