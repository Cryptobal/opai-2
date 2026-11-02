import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";

export function prepararConfiguracionTest() {
  execFileSync("pnpm", ["--filter", "@opai/db", "exec", "tsx", "scripts/seed-config-v11-e2e.ts"], {
    env: { ...process.env, DATABASE_URL_MIGRATE: process.env["DATABASE_URL_MIGRATE"] ?? process.env["OPAI_LOCAL_URL_MIGRATE_E2E"] },
    stdio: "pipe",
  });
}

export async function capturarConfiguracion(page: Page, nombre: string, tema: string, proyecto: string) {
  if (proyecto !== "telefono") {
    const nav = page.getByRole("navigation", { name: "Principal", exact: true }).filter({ visible: true });
    await expect(nav.getByText("Fijados", { exact: true })).toBeVisible();
    await expect(nav.locator('button[aria-label="Fijar"], button[aria-label="Desfijar"]').first()).toBeAttached();
  }
  if (nombre === "mas") await expect(page.getByRole("dialog", { name: "Más", exact: true })).toBeVisible();
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
  await expect(page.locator("html")).toHaveAttribute("data-theme", tema);
  await page.screenshot({ path: `../../docs/2.0/qa/configuracion-v11-navegacion/${nombre}-${tema}-${proyecto}.png`, fullPage: true, animations: "disabled" });
}
