import { type Page, type TestInfo } from "@playwright/test";

// Apoyo de `preview-e2e` (CAR-285): los e2e marcados `@preview` corren contra la vista previa de Vercel
// de cada PR, con el usuario de la empresa ficticia `qa-e2e`, a 375, 1024 y 1280 px. Sus capturas se
// suben como artefacto y las revisa la sesión que lleva el PR. Nunca se usa Gard ni datos reales.

/** Hay una vista previa remota como destino (no `next dev` local). */
export const EN_PREVIEW = /^https:\/\//.test(process.env["BASE_URL"] ?? "");

/**
 * La vista previa está detrás de la protección de Vercel: se agrega la cabecera de automatización solo a
 * las peticiones al origen de la propia vista previa, para que el secreto no viaje a terceros (mapas,
 * fuentes). Sin el secreto, o en local, no hace nada.
 */
export async function pasarProteccionDeVercel(page: Page): Promise<void> {
  const secreto = process.env["VERCEL_AUTOMATION_BYPASS_SECRET"];
  const base = process.env["BASE_URL"];
  if (!secreto || !base || !EN_PREVIEW) return;
  const origen = new URL(base).origin;
  await page.route(`${origen}/**`, (ruta) =>
    ruta.continue({ headers: { ...ruta.request().headers(), "x-vercel-protection-bypass": secreto } }),
  );
}

/**
 * Captura de pantalla completa con el tamaño en el nombre. En `preview-e2e` va a `test-results/capturas/`
 * (el artefacto del run); en local, a `e2e/__screenshots__/` como el resto de los e2e.
 */
export async function capturar(page: Page, info: TestInfo, nombre: string): Promise<void> {
  const carpeta = EN_PREVIEW ? "test-results/capturas" : "e2e/__screenshots__";
  await page.screenshot({ path: `${carpeta}/${nombre}-${info.project.name}.png`, fullPage: true });
}

/**
 * Captura una hoja o diálogo recién abierto después de que termine su animación de entrada, para que no
 * quede semitransparente sobre la pantalla (CAR-417). Ignora animaciones infinitas (indicadores de carga).
 */
export async function capturarHoja(page: Page, info: TestInfo, nombre: string): Promise<void> {
  // Las transiciones CSS recién arrancan en el cuadro siguiente: se espera un par de cuadros y se repite
  // hasta que no quede ninguna animación finita corriendo (con tope, para no colgar la prueba).
  await page.evaluate(async () => {
    const cuadro = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
    for (let i = 0; i < 10; i++) {
      await cuadro();
      await cuadro();
      const vivas = document
        .getAnimations()
        .filter((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity);
      if (vivas.length === 0) return;
      await Promise.all(vivas.map((a) => a.finished.catch(() => undefined)));
    }
  });
  await capturar(page, info, nombre);
}
