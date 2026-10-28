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
// Los seeds en TypeScript usan `dbAdmin()` (row_security=off): con `opai_app` fallan con 42501 en
// vez de saltarse la RLS. Necesitan el rol propietario de la base local: DATABASE_URL_MIGRATE (CI) o
// el de DATABASE_URL_TEST sobre la base de la app. Nunca se cae al rol de la app.
const urlMigrate = process.env["DATABASE_URL_MIGRATE"] ?? "";
export const urlPropietario = esLocal(urlMigrate) ? urlMigrate : (urlDueño?.toString() ?? "");
export const ocultarDev = (page: Page) =>
  page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
export const sinDesborde = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
