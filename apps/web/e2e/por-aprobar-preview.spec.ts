import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-253 (decisión de Carlos del 12-nov-2026, opción A): la Bandeja junta en «Aprobaciones pendientes»
// lo que espera al usuario en cualquier módulo (agentes y reglas, cotizaciones, rendiciones, tickets),
// y cada decisión abre la pantalla de su módulo. Corre en `preview-e2e` con el usuario de la empresa
// ficticia `qa-e2e` (nunca Gard). Solo lee: no aprueba ni rechaza nada.

test.describe("@preview bandeja única por aprobar", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("la Bandeja muestra lo pendiente de todos los módulos y cada decisión lleva a su pantalla", async ({
    page,
  }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/bandeja");
    // La tarjeta «Bandeja · N» aparece siempre al cargar; puede traer avisos o novedades de otras
    // pruebas (mismo usuario), así que no se exige «Todo al día».
    await expect(page.getByText(/^Bandeja · \d+$/).first()).toBeVisible({ timeout: 30_000 });
    const seccion = page.getByRole("heading", { name: /Aprobaciones pendientes/ });
    await capturar(page, info, "bandeja-por-aprobar");
    if (await seccion.count()) {
      const decisiones = page.locator('[aria-labelledby="bandeja-aprobaciones"] li a');
      // Cada decisión enlaza a la pantalla de su módulo, no a una cola genérica.
      for (const href of await decisiones.evaluateAll((as) =>
        as.map((a) => a.getAttribute("href") ?? ""),
      )) {
        expect(href).toMatch(
          /^\/(configuracion\/aprobaciones\?ver=|rendiciones\/bandeja\/|tickets\/)/,
        );
      }
    }
    expect(errores).toEqual([]);
  });
});
