import type { Page } from "@playwright/test";

export { entrar } from "./sesion";

export const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const urlTest = process.env["DATABASE_URL_TEST"] ?? "";
const urlApp = process.env["DATABASE_URL"] ?? "";
const esLocal = (u: string) => /@(localhost|127\.0\.0\.1)[:/]/.test(u);

// Usa la base local de la app con el propietario de pruebas, o el rol de la app en CI.
const urlDueño = esLocal(urlTest) && esLocal(urlApp) ? new URL(urlTest) : null;
if (urlDueño) urlDueño.pathname = new URL(urlApp).pathname;
export const urlSiembra = urlDueño?.toString() ?? (esLocal(urlApp) ? urlApp : "");
export const ocultarDev = (page: Page) =>
  page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
export const sinDesborde = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
