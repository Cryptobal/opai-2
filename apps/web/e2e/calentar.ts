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
  await calentarPaginas404(base);
}

/**
 * Páginas a las que el proxy reescribe un 404 (`respuesta404` hace un `fetch` interno con tope de 4 s).
 * Exigen sesión, así que se visitan una vez con el owner de e2e: si su primera compilación cae dentro
 * de una prueba, el `fetch` vence, el proxy cede a la página y el 404 sale como 200 (CAR-199).
 */
async function calentarPaginas404(base: string) {
  if (!E2E_PASSWORD) return;
  const navegador = await chromium.launch().catch(() => null);
  if (!navegador) return;
  try {
    const contexto = await navegador.newContext({ baseURL: base });
    const page = await contexto.newPage();
    await entrar(page);
    for (const ruta of ["/configuracion/no-encontrado?ruta=%2Fconfiguracion%2Fgrupo%2Fx", "/no-encontrado"])
      await page.goto(ruta, { timeout: 120_000 });
  } catch {
    // Calentar no es una prueba: si falla, que lo diga la prueba que lo necesite.
  } finally {
    await navegador.close();
  }
}
