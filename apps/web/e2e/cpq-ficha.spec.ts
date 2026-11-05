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
  await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
  // Ficha por pasos (#325): el código es el título (en teléfono lo muestra el patrón) y el resumen es una región.
  await expect(page.getByRole("heading", { name: /^CPQ-/ }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Resumen de la cotización" })).toBeVisible();
  // El gestor sin permiso de costos no ve el bloque de costos (#325): aviso en español, sin claves técnicas.
  await page.getByRole("button", { name: /Costos y margen/ }).click();
  await expect(page.getByText("No tienes permiso para ver costos ni margen.")).toBeVisible();
  await expect(page.getByText("mano_obra")).toHaveCount(0);
  await sinDesborde(page);
  await page.screenshot({
    path: info.outputPath("cpq-ficha-resumen.png"),
    fullPage: true,
  });
});

test("con costos pendientes no ofrece Dejar lista y avisa no enviable", async ({ page }, info) => {
  const numero = numeros[info.project.name] ?? 1;
  const negocio = `00000000-0000-7000-8000-00000000132${numero}`;
  await entrar(page, "cpq-gestor@example.test");
  await page.goto(`/negocios/${negocio}`);
  await page.getByRole("link", { name: "Nueva cotización", exact: true }).click();
  const titulo = `Error costos ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
  await page.getByRole("button", { name: "Agregar puesto" }).click();
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  // Con el puesto sin costear la cotización queda «Incompleta»: la única acción es completar los datos.
  await expect(page.getByText("Incompleta", { exact: true }).filter({ visible: true }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Completar los datos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dejar lista" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pedir aprobación" })).toHaveCount(0);
  // «Vista previa PDF» vive en el menú «Más acciones» en todos los anchos.
  await page.getByRole("button", { name: "Más acciones de la cotización" }).click();
  await expect(page.getByRole("menuitem", { name: "Vista previa PDF" })).toBeVisible();
  await sinDesborde(page);
});
