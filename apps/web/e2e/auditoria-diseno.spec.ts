import { type Browser, test } from "@playwright/test";

import { guardarInforme, recorrer } from "./auditoria/recorrer";
import { type Portal, rutasAuditables } from "./auditoria/rutas";
import { pasarProteccionDeVercel } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// Auditoría de diseño y experiencia contra Hilo (DISENO-hilo.md, ADR-105, CAR-334). Recorre todas las
// rutas de ERP, Cliente, Guardia y Terreno a 1440 y 390 px, con la empresa ficticia `qa-e2e` (nunca
// Gard ni datos reales), y deja una captura y una medición por pantalla. El ERP se recorre en el
// marco Hilo (cookie `opai_marco`); los otros portales aún no lo tienen (H5) y se ven en el clásico.
// No escribe datos. Solo corre con `--grep @auditoria` (workflow `auditoria-diseno`), nunca en
// `preview-e2e`: tarda decenas de minutos.

const ANCHOS = [
  { nombre: "1440", viewport: { width: 1440, height: 900 }, telefono: false },
  { nombre: "390", viewport: { width: 390, height: 844 }, telefono: true },
] as const;

const rutas = rutasAuditables();
const DE_PORTAL: Portal[] = ["cliente", "guardia", "terreno", "publico"];

async function contexto(browser: Browser, ancho: (typeof ANCHOS)[number], hilo: boolean) {
  const ctx = await browser.newContext({
    viewport: ancho.viewport,
    isMobile: ancho.telefono,
    hasTouch: ancho.telefono,
    locale: "es-CL",
    timezoneId: "America/Santiago",
  });
  if (hilo) {
    const base = process.env["BASE_URL"] ?? "http://localhost:3000";
    await ctx.addCookies([{ name: "opai_marco", value: "hilo", url: base }]);
  }
  const page = await ctx.newPage();
  await pasarProteccionDeVercel(page);
  return { ctx, page };
}

test.describe("@auditoria diseño Hilo", () => {
  test.describe.configure({ mode: "parallel" });
  test.skip(!process.env["AUDITORIA_DISENO"], "Solo en el workflow auditoria-diseno (AUDITORIA_DISENO=1)");

  ANCHOS.forEach((ancho, i) => {
    test(`ERP a ${ancho.nombre} px`, async ({ browser }, info) => {
      test.skip(info.project.name !== "desktop", "una sola corrida: el ancho lo fija la prueba");
      test.skip(!E2E_PASSWORD, "Falta E2E_PASSWORD");
      test.setTimeout(70 * 60_000);
      const { ctx, page } = await contexto(browser, ancho, true);
      // Dos sesiones a la vez con el mismo código TOTP: la segunda espera el siguiente período.
      if (i > 0) await page.waitForTimeout(32_000);
      await entrar(page);
      const filas = await recorrer(
        page,
        rutas.filter((r) => r.portal === "erp"),
        ancho.nombre,
        ancho.telefono,
      );
      guardarInforme(`erp-${ancho.nombre}`, filas);
      await ctx.close();
    });

    test(`portales sin sesión a ${ancho.nombre} px`, async ({ browser }, info) => {
      test.skip(info.project.name !== "desktop", "una sola corrida: el ancho lo fija la prueba");
      test.setTimeout(20 * 60_000);
      const { ctx, page } = await contexto(browser, ancho, false);
      const filas = await recorrer(
        page,
        rutas.filter((r) => DE_PORTAL.includes(r.portal) && !r.dinamica),
        ancho.nombre,
        ancho.telefono,
      );
      guardarInforme(`portales-${ancho.nombre}`, filas);
      await ctx.close();
    });
  });

  // Portal Cliente con el contacto prospecto de `qa-e2e`, si existen sus secretos (CAR-300).
  test("Portal Cliente con el prospecto", async ({ browser }, info) => {
    const email = process.env["E2E_PROSPECTO_EMAIL"];
    const clave = process.env["E2E_PROSPECTO_PASSWORD"];
    test.skip(info.project.name !== "desktop" || !email || !clave, "Sin contacto prospecto");
    test.setTimeout(20 * 60_000);
    for (const ancho of ANCHOS) {
      const { ctx, page } = await contexto(browser, ancho, false);
      await page.goto("/login");
      await page.getByLabel("Correo").fill(email ?? "");
      await page.getByLabel("Contraseña", { exact: true }).fill(clave ?? "");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForURL((u) => u.pathname.startsWith("/cliente"), { timeout: 45_000 });
      const filas = await recorrer(
        page,
        rutas.filter((r) => r.portal === "cliente" && r.patron !== "/cliente/login"),
        ancho.nombre,
        ancho.telefono,
      );
      guardarInforme(`cliente-${ancho.nombre}`, filas);
      await ctx.close();
    }
  });
});
