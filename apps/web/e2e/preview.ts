import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

// Apoyo de `preview-e2e` (CAR-285): los e2e marcados `@preview` corren contra la vista previa de Vercel
// de cada PR, con el usuario de la empresa ficticia `qa-e2e`, a 375, 1024 y 1280 px. Sus capturas se
// suben como artefacto y las revisa la sesión que lleva el PR. Nunca se usa Gard ni datos reales.

/** Hay una vista previa remota como destino (no `next dev` local). */
export const EN_PREVIEW = /^https:\/\//.test(process.env["BASE_URL"] ?? "");
const CARPETA_CAPTURAS =
  EN_PREVIEW || process.env["CI"] ? "test-results/capturas" : "e2e/__screenshots__";

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
    ruta.continue({
      headers: { ...ruta.request().headers(), "x-vercel-protection-bypass": secreto },
    }),
  );
}

/**
 * Captura de pantalla completa con el tamaño en el nombre. En `preview-e2e` y en el job e2e de CI (Postgres
 * efímero) va a `test-results/capturas/`, que sube el artefacto del run; en local, a `e2e/__screenshots__/`.
 * En CI es donde quedan las capturas de Plataforma: la vista previa copia la base con Gard y la cuenta de QA
 * no tiene rol de plataforma (CAR-323, decisión de Carlos del 14-nov).
 */
/**
 * Pulsa un control de la planilla dejándolo a la derecha de la columna fija y sobre la barra del teléfono.
 * El toque de Playwright, si no, cae en esa columna o en la barra inferior.
 */
export async function pulsarEnPlanilla(control: Locator): Promise<void> {
  await control.evaluate((el) => {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const th = el.closest("tr")?.querySelector("th");
    const scroller = el.closest("table")?.parentElement;
    if (th && scroller && !th.contains(el)) {
      const tapa = th.getBoundingClientRect().right - el.getBoundingClientRect().left + 8;
      if (tapa > 0) scroller.scrollLeft += tapa;
    }
    const nav = document.querySelector("[data-shell='inferior-nuevo']");
    const limite = (nav?.getBoundingClientRect().top ?? window.innerHeight) - 8;
    const bajo = el.getBoundingClientRect().bottom - limite;
    if (bajo > 0) window.scrollBy(0, bajo);
  });
  await control.click();
}

/**
 * Deja un botón plegable en `abierto`. En el teléfono el HTML llega antes que la hidratación y un toque
 * temprano se pierde, así que se repite hasta que el estado cambia; nunca pulsa si ya está como se pide.
 */
export async function plegarHasta(boton: Locator, abierto: boolean): Promise<void> {
  const esperado = String(abierto);
  await expect(async () => {
    if ((await boton.getAttribute("aria-expanded")) !== esperado) await pulsarEnPlanilla(boton);
    await expect(boton).toHaveAttribute("aria-expanded", esperado, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

export async function capturar(page: Page, info: TestInfo, nombre: string): Promise<void> {
  const carpeta = CARPETA_CAPTURAS;
  await page.screenshot({ path: `${carpeta}/${nombre}-${info.project.name}.png`, fullPage: true });
}

/**
 * Captura una hoja o diálogo recién abierto después de que termine su animación de entrada, para que no
 * quede semitransparente sobre la pantalla (CAR-417). Ignora animaciones infinitas (indicadores de carga)
 * y captura solo la ventana visible.
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
        .filter(
          (a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity,
        );
      if (vivas.length === 0) return;
      await Promise.all(vivas.map((a) => a.finished.catch(() => undefined)));
    }
  });
  // Sin `fullPage`: alargar la ventana para la captura completa cambia el diseño en iPad (borde táctil de
  // 1024 px) y la hoja vuelve a animar su entrada. La hoja ocupa la ventana, así que basta lo visible.
  const carpeta = CARPETA_CAPTURAS;
  await page.screenshot({ path: `${carpeta}/${nombre}-${info.project.name}.png` });
}
