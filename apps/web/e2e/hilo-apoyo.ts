import { type Page, type TestInfo } from "@playwright/test";

import { capturar, EN_PREVIEW } from "./preview";

/** Bajo 1024 px se ve la navegación de teléfono. */
export const enTelefono = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;
// En local las capturas van a e2e/__screenshots__/; en `preview-e2e`, al artefacto del run (A2.10).
export const captura = (page: Page, nombre: string, info: TestInfo) => capturar(page, info, nombre);

// Ruido que no es de la aplicación. Con `next dev` (en local y en el job e2e de CI, que también fija
// BASE_URL): el aviso de «uncached data» por la lectura de la sesión en el layout y los dos avisos de
// una recarga en caliente. En la vista previa de Vercel: su barra de comentarios, que nuestra CSP
// bloquea, y el service worker, que la protección de Vercel responde con una redirección. Cualquier
// otro error de consola hace fallar la prueba.
const RUIDO = EN_PREVIEW
  ? ["vercel.live", "The script resource is behind a redirect"]
  : [
      "encountered uncached data during prerendering or a navigation",
      "The server could not finish this Suspense boundary",
      "Encountered a script tag while rendering React component",
    ];

export function erroresDeConsola(page: Page): string[] {
  const errores: string[] = [];
  const anotar = (texto: string) => {
    if (!RUIDO.some((r) => texto.includes(r))) errores.push(texto);
  };
  page.on("console", (m) => {
    if (m.type() === "error") anotar(m.text());
  });
  page.on("pageerror", (e) => anotar(String(e)));
  return errores;
}
