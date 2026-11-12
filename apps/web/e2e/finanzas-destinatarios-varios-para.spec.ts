import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-320 · ADR-103: al emitir, los destinatarios del correo admiten varios PARA (todos los contactos de facturación
// reciben por igual) y la casilla DTE va en copia. Guarda un borrador ficticio para ver el editor; no emite nada.
// En local usa el cliente de `seed-ventas-e2e.ts`; en `preview-e2e`, el de la empresa ficticia `qa-e2e`.
test.setTimeout(180_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

const CLIENTE = EN_PREVIEW ? "Cliente ficticio QA E2E" : "Cliente ficticio Ventas E2E";
const NUMERO: Record<string, string> = { telefono: "1", ipad: "2", desktop: "3" };

test.describe("@preview finanzas: destinatarios con varios PARA", () => {
  test("el editor deja varios correos en PARA y lo explica", async ({ page }, info) => {
    if (!EN_PREVIEW)
      execFileSync(
        "pnpm",
        ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-ventas-e2e.ts", NUMERO[info.project.name] ?? "1"],
        { cwd: new URL("../../..", import.meta.url), env: process.env, stdio: "inherit" },
      );
    await entrar(page);
    await page.goto("/finanzas/ventas/nuevo");
    const cuenta = page.locator("#emit-cuenta");
    await expect(cuenta).toBeVisible({ timeout: 60_000 });
    await hidratado(cuenta);
    await cuenta.click();
    await page.keyboard.type(CLIENTE.slice(0, 18));
    // En teléfono la lista abre en una hoja: se elige con Enter la opción ya resaltada.
    await expect(page.getByRole("option", { name: new RegExp(CLIENTE) }).first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await page.locator("#emit-l-g-0").fill("Servicio ficticio · prueba de destinatarios (e2e)");
    await page.locator("#emit-l-p-0").fill("1000");
    await page.getByRole("button", { name: "Guardar borrador" }).click();

    await expect(page.getByRole("heading", { name: "Destinatarios del correo" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Todos los contactos de facturación reciben como PARA/)).toBeVisible();

    // Dos correos agregados a mano quedan los dos en PARA (antes el segundo pasaba a copia).
    // Esperar a que carguen los sugeridos: si no, la carga reemplaza lo agregado antes.
    await expect(
      page.getByText("El cliente no tiene casilla DTE ni contactos de facturación").or(page.getByLabel(/^Tipo de /).first()),
    ).toBeVisible({ timeout: 30_000 });
    const nuevo = page.getByLabel("Agregar un correo");
    const agregar = page.getByRole("button", { name: "Agregar", exact: true });
    for (const correo of ["uno.e2e@cliente-ficticio.test", "dos.e2e@cliente-ficticio.test"]) {
      await nuevo.fill(correo);
      await expect(agregar).toBeEnabled();
      await agregar.click();
      await expect(page.getByLabel(`Tipo de ${correo}`)).toBeVisible();
    }
    await expect(page.getByLabel("Tipo de uno.e2e@cliente-ficticio.test")).toContainText("PARA");
    await expect(page.getByLabel("Tipo de dos.e2e@cliente-ficticio.test")).toContainText("PARA");
    await expect(page.getByText(/Solo puede haber un destinatario PARA/)).toHaveCount(0);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await page.getByRole("heading", { name: "Destinatarios del correo" }).scrollIntoViewIfNeeded();
    const carpeta = EN_PREVIEW ? "test-results/capturas" : "e2e/__screenshots__";
    await page.screenshot({ path: `${carpeta}/destinatarios-varios-para-${info.project.name}.png` });
  });
});
