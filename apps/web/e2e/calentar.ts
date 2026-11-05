import { chromium } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Precalienta, antes de cada corrida (y de cada shard de CI), las rutas que el proxy consulta con un
// tope de 4 s: en `next dev` la primera visita compila la ruta y, si `/api/existe` tarda más que eso,
// el proxy deja decidir a la página y una ficha fuera de alcance muestra su aviso en línea en vez del
// 404 del portal (navegacion-permisos, CAR-60). Sin sesión responde rápido; solo importa compilar.
export default async function calentar() {
  const base = process.env["BASE_URL"] ?? "http://localhost:3000";
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(base)) return;
  for (const ruta of [
    "/api/existe?ruta=%2Fpersonas%2F00000000-0000-7000-8000-000000000000",
    "/api/health",
  ]) {
    await fetch(`${base}${ruta}`, { signal: AbortSignal.timeout(120_000) }).catch(() => undefined);
  }
  await calentarConSesion(base);
}

/**
 * Rutas con sesión que se visitan una vez antes de las pruebas. Exigen sesión, así que entra el owner
 * de e2e y las recorre:
 *  - las páginas a las que el proxy reescribe un 404 (`respuesta404` hace un `fetch` interno con tope
 *    de 4 s): si su primera compilación cae dentro de una prueba, el `fetch` vence y el 404 sale 200;
 *  - las rutas más pesadas que usan las pruebas: en `next dev` la primera visita de cada ruta compila
 *    (varios segundos en el runner) y se comía los 5 s del `expect` o los 30 s de la hidratación.
 * Calentar no es una prueba: una ruta que falla o tarda se salta (CAR-199).
 */
const RUTAS_CON_SESION = [
  "/configuracion/no-encontrado?ruta=%2Fconfiguracion%2Fgrupo%2Fx",
  "/configuracion/grupo/inventado",
  "/sin-conexion",
  "/no-encontrado",
  "/supervisor/personas/00000000-0000-7000-8000-000000000001",
  "/",
  "/bandeja",
  "/personas",
  "/cuentas",
  "/instalaciones",
  "/configuracion/usuarios",
  "/rendiciones",
  "/negocios",
  "/cotizaciones",
  "/cotizaciones/nueva",
  "/solicitudes",
  "/tareas",
  "/pauta",
  "/remuneraciones",
  "/finanzas/flujo",
  "/personas?nueva=1",
  "/mi-cuenta/preferencias",
  "/configuracion",
  "/configuracion/grupo/operacion",
  "/configuracion/modulo/comercial?seccion=embudo",
];

async function calentarConSesion(base: string) {
  if (!E2E_PASSWORD) return;
  const navegador = await chromium.launch().catch(() => null);
  if (!navegador) return;
  try {
    const contexto = await navegador.newContext({ baseURL: base });
    const page = await contexto.newPage();
    await entrar(page);
    for (const ruta of RUTAS_CON_SESION) await page.goto(ruta, { timeout: 120_000 }).catch(() => undefined);
  } catch {
    // Si no entra, que lo diga la prueba que lo necesite.
  } finally {
    await navegador.close();
  }
}
