import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Portal del trabajador · barra inferior (CAR-494) en `preview-e2e`: en el teléfono hay un solo «Más», el del
// portal; la cuenta (cerrar sesión, contraseña) sigue en el avatar de la barra superior. En iPad y escritorio la
// barra inferior no se muestra. Sin portal trabajador en `qa-e2e`, se anota como omitido.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview trabajador barra inferior", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el teléfono muestra un solo «Más»", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);
    await page.goto("/trabajador");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const barra = page.getByRole("navigation", { name: "Principal" }).last();
    const sinPortal = page.getByText(
      /Portal no disponible en tu empresa|No tienes acceso a este portal/,
    );
    if (await sinPortal.count()) {
      info.annotations.push({ type: "omitido", description: "qa-e2e sin portal trabajador" });
      expect(errores).toEqual([]);
      return;
    }
    await capturar(page, info, "trabajador-barra-inferior");
    if ((page.viewportSize()?.width ?? 0) < 768) {
      await expect(barra.getByText("Más", { exact: true })).toHaveCount(1);
      await expect(barra.getByRole("link", { name: "Más" })).toHaveAttribute(
        "href",
        "/trabajador/mas",
      );
    }
    expect(errores).toEqual([]);
  });
});
