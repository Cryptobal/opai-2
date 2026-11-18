import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Instalación · pestaña Personas (CAR-596) en `preview-e2e`: con Pauta activa muestra vínculos y dotación
// por puesto; a 375, 1024 y 1280 px con el usuario de la empresa ficticia `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("@preview instalación personas dotación", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("pestaña Personas lista vínculos y puestos", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/instalaciones");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const enlace = page
      .locator('a[href^="/instalaciones/"]:not([href^="/instalaciones/nueva"])')
      .filter({ visible: true })
      .first();
    const href = (await enlace.count()) ? await enlace.getAttribute("href") : null;
    const inst = href?.split("/")[2]?.split("?")[0];
    if (!inst) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin instalaciones" });
      return;
    }
    await page.goto(`/instalaciones/${inst}/personas`);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const personas = page.getByRole("tab", { name: /Personas|Guardias/i });
    if ((await personas.count()) === 0) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin módulo Pauta" });
      return;
    }
    await expect(personas).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByText("Vínculos vigentes").or(page.getByText("Sin puestos activos")).first(),
    ).toBeVisible();
    await expect(page.getByText("Disponible con Operaciones")).toHaveCount(0);
    await capturar(page, info, "instalacion-personas-dotacion");
    expect(errores).toEqual([]);
  });
});