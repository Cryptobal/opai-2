import { test } from "@playwright/test";

import { CARPETA_REVISION, guardarInforme, recorrer } from "./auditoria/recorrer";
import { rutasAuditables } from "./auditoria/rutas";
import { pasarProteccionDeVercel } from "./preview";
import { entrar } from "./sesion";

// Revisión de diseño de un PR (CAR-334, fase 3): captura las pantallas que toca el PR (RUTAS, una por
// línea) en la vista previa o en `main` (ETIQUETA), a 1440 y 390 px, en el marco Hilo, con `qa-e2e`.
// La usa el workflow `revision-diseno`; Claude compara las dos carpetas contra DISENO-hilo.md.

const lista = (process.env["RUTAS"] ?? "")
  .split("\n")
  .map((r) => r.trim())
  .filter(Boolean);
const etiqueta = process.env["ETIQUETA"] ?? "preview";

test("@revision capturas del PR", async ({ browser }, info) => {
  test.skip(
    info.project.name !== "desktop" || lista.length === 0,
    "Sin rutas o no es la corrida única",
  );
  test.setTimeout(30 * 60_000);
  const todas = rutasAuditables();
  const rutas = todas.filter((r) => lista.includes(r.patron));
  for (const [i, ancho] of [
    { nombre: "1440", viewport: { width: 1440, height: 900 }, telefono: false },
    { nombre: "390", viewport: { width: 390, height: 844 }, telefono: true },
  ].entries()) {
    const ctx = await browser.newContext({
      viewport: ancho.viewport,
      isMobile: ancho.telefono,
      hasTouch: ancho.telefono,
      locale: "es-CL",
      timezoneId: "America/Santiago",
    });
    await ctx.addCookies([
      {
        name: "opai_marco",
        value: "hilo",
        url: process.env["BASE_URL"] ?? "http://localhost:3000",
      },
    ]);
    const page = await ctx.newPage();
    await pasarProteccionDeVercel(page);
    if (i > 0) await page.waitForTimeout(32_000);
    await entrar(page);
    const filas = await recorrer(
      page,
      rutas,
      ancho.nombre,
      ancho.telefono,
      `${CARPETA_REVISION}/${etiqueta}`,
      todas,
    );
    guardarInforme(`${etiqueta}-${ancho.nombre}`, filas, `${CARPETA_REVISION}/${etiqueta}`);
    await ctx.close();
  }
});
