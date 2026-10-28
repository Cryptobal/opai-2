import type { BrowserContext, Page } from "@playwright/test";

// Solo dev: el indicador de Next («N Insight») tapa la barra inferior a 375 px.
// Con un contexto cubre también las pestañas nuevas. Lo aplica el login compartido (`sesion.ts`):
// con un aviso de dev (p. ej. «Insight» de Cache Components) el badge de Next tapa controles del
// pie y se traga los clics, en 375 px y en el pie de la barra lateral.
export async function ocultarIndicadorDev(page: Page | BrowserContext) {
  await page.addInitScript(() => {
    const poner = () => {
      const estilo = document.createElement("style");
      estilo.textContent = "nextjs-portal{display:none!important}";
      document.documentElement.appendChild(estilo);
    };
    if (document.documentElement) poner();
    else document.addEventListener("DOMContentLoaded", poner);
  });
}
