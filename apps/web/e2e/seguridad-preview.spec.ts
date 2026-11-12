import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// `@preview` de CAR-286 (ADR-092): login con passkey y Mi cuenta › Seguridad a 375, 1024 y 1280 px.
// Solo lectura: abre la hoja de alta y el diálogo de quitar y los cierra sin confirmar, así el usuario de
// pruebas no cambia sus métodos. El flujo completo (con autenticador virtual) está en passkeys.spec.ts.
test.describe("@preview seguridad: passkeys y métodos de acceso", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("login con passkey y Mi cuenta › Seguridad", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    // Sin animaciones (el DS respeta prefers-reduced-motion): capturas estables.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await pasarProteccionDeVercel(page);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar con passkey" })).toBeVisible();
    await capturar(page, info, "seguridad-login");

    await entrar(page);
    await page.goto("/mi-cuenta");
    await expect(page.getByRole("heading", { name: "Seguridad" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Passkeys" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "App autenticadora" })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "seguridad-mi-cuenta");

    const nombre = page.getByRole("textbox", { name: "Nombre" });
    await expect(async () => {
      if (!(await nombre.isVisible()))
        await page.getByRole("button", { name: "Agregar passkey" }).click();
      await expect(nombre).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await nombre.evaluate((n) =>
      Promise.all(
        (n.closest('[role="dialog"]') ?? n).getAnimations({ subtree: true }).map((a) => a.finished),
      ),
    );
    await capturar(page, info, "seguridad-agregar-passkey");
    await page.keyboard.press("Escape");
    await expect(nombre).toHaveCount(0);

    const desactivar = page.getByRole("button", { name: "Desactivar" });
    if (await desactivar.isVisible()) {
      await desactivar.click();
      const dialogo = page.getByRole("dialog");
      await expect(dialogo).toContainText("confirma que eres tú");
      // Captura con el diálogo ya opaco: espera a que terminen sus transiciones de entrada.
      await dialogo.evaluate((d) =>
        Promise.all(d.getAnimations({ subtree: true }).map((a) => a.finished)),
      );
      await capturar(page, info, "seguridad-quitar-app");
      await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    }
    expect(errores).toEqual([]);
  });
});
