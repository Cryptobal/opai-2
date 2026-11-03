import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

const NEGOCIO = "00000000-0000-7000-8000-000000001399";

test.setTimeout(180_000);
test.beforeAll(() => {
  execFileSync(
    "pnpm",
    ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-cpq-vacio-e2e.ts"],
    { cwd: new URL("../../..", import.meta.url), env: process.env, stdio: "inherit" },
  );
});

test("tenant vacío: cotización calculada, avisos concretos y enlace a Remuneraciones", async ({ page }) => {
  await entrar(page, "cpq-vacio@example.test");
  await page.goto(`/negocios/${NEGOCIO}`);
  await page.getByRole("link", { name: "Nueva cotización", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill(`Primera cotización ${Date.now()}`);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/[^/?#]+$/);

  await expect(page.getByText("Mutual adicional sin confirmar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Confirmar mutual" })).toHaveAttribute(
    "href",
    "/configuracion/remuneraciones",
  );

  const venta = page.locator("p.t-h2.t-numeric").first();
  await expect(venta).not.toHaveText("Pendiente");

  await page.getByRole("button", { name: "Recalcular" }).click();
  await expect(page.getByText(/Mutual adicional sin confirmar|Falta el indicador/i)).toBeVisible();

  await page.getByRole("link", { name: "Confirmar mutual" }).click();
  await expect(page).toHaveURL(/\/configuracion\/remuneraciones/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
