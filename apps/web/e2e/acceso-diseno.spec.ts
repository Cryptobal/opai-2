import { expect, test } from "@playwright/test";

// Pantallas de acceso con datos ficticios (/ds/acceso) para compararlas con el export aprobado
// (docs/2.0/design/export-acceso). Capturas en e2e/__screenshots__/acceso/.
const VARIANTES = [
  "login",
  "login-error",
  "login-suspendida",
  "login-cargando",
  "recuperar",
  "recuperar-enviado",
  "recuperar-nueva",
  "recuperar-vencido",
  "invitacion-sin-cuenta",
  "invitacion-con-cuenta",
  "invitacion-vencida",
  "invitacion-usada",
  "elegir-empresa",
];
const OSCURO = ["login", "login-error", "invitacion-sin-cuenta"];

for (const v of VARIANTES) {
  test(`acceso: ${v}`, async ({ page }, info) => {
    for (const tema of OSCURO.includes(v) ? (["light", "dark"] as const) : (["light"] as const)) {
      await page.emulateMedia({ colorScheme: tema });
      await page.goto(`/ds/acceso?v=${v}`);
      await expect(page.locator("main")).toBeVisible();
      await page.screenshot({
        path: `e2e/__screenshots__/acceso/${v}${tema === "dark" ? "-oscuro" : ""}-${info.project.name}.png`,
        fullPage: true,
      });
    }
  });
}
