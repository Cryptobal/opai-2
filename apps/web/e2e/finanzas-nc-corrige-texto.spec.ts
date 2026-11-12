import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-270 · La nota de crédito que solo corrige texto no pide monto: el campo desaparece y un aviso explica que va
// sin monto. Solo abre la hoja y cambia el tipo; no emite nada. En local usa la factura aceptada ficticia de
// `seed-ventas-e2e.ts`; en `preview-e2e`, la de la empresa ficticia `qa-e2e`.
test.setTimeout(180_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

const EMITIDA = EN_PREVIEW
  ? "00000000-0000-7000-8000-000000267002"
  : "00000000-0000-7000-8000-000000002553";
const NUMERO: Record<string, string> = { telefono: "1", ipad: "2", desktop: "3" };

test.describe("@preview finanzas: nota de crédito que corrige texto", () => {
  test("elegir «Corrige texto» quita el monto y lo explica", async ({ page }, info) => {
    if (!EN_PREVIEW)
      execFileSync(
        "pnpm",
        ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-ventas-e2e.ts", NUMERO[info.project.name] ?? "1"],
        { cwd: new URL("../../..", import.meta.url), env: process.env, stdio: "inherit" },
      );
    await entrar(page);
    await page.goto(`/finanzas/ventas/${EMITIDA}`);
    const abrir = page.getByRole("button", { name: "Nota de crédito", exact: true });
    await expect(abrir).toBeVisible({ timeout: 60_000 });
    await hidratado(abrir);
    await abrir.click();
    const hoja = page.getByRole("dialog", { name: "Emitir nota de crédito" });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByLabel("Monto (CLP)")).toBeVisible();

    await hoja.getByLabel("Qué hace la nota").click();
    await page.getByRole("option", { name: "Corrige texto" }).click();
    await expect(hoja.getByLabel("Monto (CLP)")).toHaveCount(0);
    await expect(hoja.getByText("Esta nota solo corrige el texto del documento.")).toBeVisible();

    // Con motivo basta para poder emitir; no se emite.
    const emitir = hoja.getByRole("button", { name: "Emitir nota" });
    await expect(emitir).toBeDisabled();
    await hoja.getByLabel("Motivo").fill("Corrige la glosa (prueba)");
    await expect(emitir).toBeEnabled();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const carpeta = EN_PREVIEW ? "test-results/capturas" : "e2e/__screenshots__";
    await page.screenshot({ path: `${carpeta}/nc-corrige-texto-${info.project.name}.png` });

    // Volver a «Anula» devuelve el campo de monto.
    await hoja.getByLabel("Qué hace la nota").click();
    await page.getByRole("option", { name: "Anula el documento" }).click();
    await expect(hoja.getByLabel("Monto (CLP)")).toBeVisible();
  });
});
