/// <reference types="node" />
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { axe } from "./auditoria/medir";
import { EN_PREVIEW, pasarProteccionDeVercel } from "./preview";

// Que el diseño no retroceda (CAR-334, fase 3; DISENO-hilo.md R11). Capturas de referencia de pantallas
// públicas y estables contra la vista previa de cada PR (`preview-e2e`; sin sesión, para no sumar ingresos con el mismo código TOTP a los e2e de las demás sesiones) y axe sin
// violaciones serias ni críticas nuevas. Si falta la referencia de una pantalla, la prueba deja la
// captura candidata en el artefacto (`referencias-candidatas/`) y no compara: la sesión la revisa y la
// copia a `e2e/diseno-referencias.spec.ts-snapshots/`. Cambiar el diseño a propósito = actualizar la
// referencia en el mismo PR.

const PUBLICAS = ["/login", "/recuperar", "/trabajador/login", "/terreno/emparejar", "/cliente/login"];

/** Violaciones de axe ya conocidas al fijar la regla (se bajan en la fase 2, no se suman). */
const AXE_CONOCIDAS: Record<string, string[]> = {};

const nombre = (ruta: string) => ruta.replace(/^\//, "").replace(/\//g, "-") || "inicio";

async function referencia(page: Page, ruta: string) {
  const info = test.info();
  const archivo = `${nombre(ruta)}.png`;
  const opciones = { fullPage: true, animations: "disabled" as const, maxDiffPixelRatio: 0.02 };
  if (existsSync(info.snapshotPath(archivo))) {
    await expect(page).toHaveScreenshot(archivo, opciones);
  } else {
    const carpeta = EN_PREVIEW ? "test-results/capturas" : "e2e/__screenshots__";
    const destino = `${carpeta}/referencias-candidatas/${nombre(ruta)}-${info.project.name}-linux.png`;
    mkdirSync(dirname(destino), { recursive: true });
    await page.screenshot({ path: destino, fullPage: true, animations: "disabled" });
  }
  const nuevas = (await axe(page))
    .map((v) => v.id)
    .filter((id) => !(AXE_CONOCIDAS[ruta] ?? []).includes(id));
  expect(nuevas, `axe en ${ruta}`).toEqual([]);
}

async function asentar(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
}

test.describe("@preview referencias de diseño Hilo", () => {
  for (const ruta of PUBLICAS) {
    test(`pantalla pública ${ruta}`, async ({ page }) => {
      await pasarProteccionDeVercel(page);
      await page.goto(ruta);
      await asentar(page);
      await referencia(page, ruta);
    });
  }
});
