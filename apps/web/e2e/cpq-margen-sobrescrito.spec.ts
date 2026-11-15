import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { entrar } from "./sesion";
import { irANuevaCotizacion } from "./negocios-ayuda";

// CAR-214: en «Margen y finanzas», además de los campos de valor, los selectores de modo y plazo se
// marcan «Sobrescrito» cuando difieren del valor de la empresa, y «Volver al valor por defecto» los repone.
const numeros: Record<string, number> = { telefono: 1, ipad: 2, desktop: 3 };
test.setTimeout(180_000);
test.beforeAll(() => {
  execFileSync("pnpm", ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-cpq-e2e.ts"], {
    cwd: new URL("../../..", import.meta.url),
    env: process.env,
    stdio: "inherit",
  });
});

test("el selector de cálculo de la RC se marca sobrescrito y vuelve al valor por defecto", async ({ page }, info) => {
  const negocio = `00000000-0000-7000-8000-00000000132${numeros[info.project.name] ?? 1}`;
  await entrar(page, "cpq-costos@example.test");
  await page.goto(`/negocios/${negocio}`);
  await irANuevaCotizacion(page);
  await page.getByLabel("Título", { exact: true }).fill(`Margen sobrescrito ${info.project.name} ${Date.now()}`);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
  await page.getByRole("button", { name: /Costos y margen/ }).click();
  await page.getByRole("button", { name: "Cambiar margen" }).click();
  const hoja = page.getByRole("dialog");
  await expect(hoja.getByRole("heading", { name: "Margen y finanzas" })).toBeVisible({ timeout: 60_000 });
  const rc = hoja.getByRole("switch", { name: /Responsabilidad civil/ });
  if ((await rc.getAttribute("aria-checked")) !== "true") await rc.click();
  await expect(hoja.getByText("Sobrescrito", { exact: true })).toHaveCount(0);
  const segmento = hoja.getByRole("group", { name: "Cálculo de la RC" });
  const otro = (await segmento.getByRole("button", { name: "Prima anual (UF)" }).getAttribute("aria-pressed")) === "true"
    ? "Tasa sobre asegurado"
    : "Prima anual (UF)";
  await segmento.getByRole("button", { name: otro }).click();
  await expect(hoja.getByText("Sobrescrito", { exact: true }).first()).toBeVisible();
  await capturar(page, info, "cpq-margen-selector-sobrescrito");
  await hoja.getByRole("button", { name: "Volver al valor por defecto" }).first().click();
  await expect(hoja.getByText("Sobrescrito", { exact: true })).toHaveCount(0);
});
