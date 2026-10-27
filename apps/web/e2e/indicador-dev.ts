import type { Page } from "@playwright/test";

// Solo dev: el indicador de Next («N Insight») tapa la barra inferior a 375 px.
export async function ocultarIndicadorDev(page: Page) {
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
