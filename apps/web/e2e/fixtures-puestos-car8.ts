import type { Page } from "@playwright/test";

export { entrar } from "./sesion";

export const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const urlMigrate = process.env["DATABASE_URL_MIGRATE"] ?? "";
const urlTest = process.env["DATABASE_URL_TEST"] ?? "";
const urlApp = process.env["DATABASE_URL"] ?? "";
const esLocal = (u: string) => /@(localhost|127\.0\.0\.1)[:/]/.test(u);

// Rol propietario para sembrar: en CI, `DATABASE_URL_MIGRATE` ya es el superusuario apuntando a la
// base correcta durante los e2e; en desarrollo local se deriva del propietario de `DATABASE_URL_TEST`
// con la base de `DATABASE_URL`. Nunca cae a `DATABASE_URL` (rol `opai_app`, sin BYPASSRLS): los
// scripts usan `dbAdmin()`, que fija `row_security=off`, y con `opai_app` eso falla (42501) en toda
// tabla con RLS sin importar `app.tenant_id` (el rol no puede desactivar la política; no es un
// filtrado silencioso por fila, por eso fijar `app.tenant_id` en el script no alcanza).
const urlDueño = esLocal(urlMigrate)
  ? new URL(urlMigrate)
  : esLocal(urlTest) && esLocal(urlApp)
    ? new URL(urlTest)
    : null;
if (urlDueño && !esLocal(urlMigrate)) urlDueño.pathname = new URL(urlApp).pathname;
export const urlSiembra = urlDueño?.toString() ?? "";
export const ocultarDev = (page: Page) =>
  page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
export const sinDesborde = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
