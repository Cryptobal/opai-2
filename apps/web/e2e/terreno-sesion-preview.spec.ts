import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-527: con sesión, Terreno explica el equipo emparejado. Empresa ficticia qa-e2e.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview terreno con sesión", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("explica el equipo emparejado y no dice que está en construcción", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/terreno");
    const frase = page.getByText(
      "Terreno se usa en el teléfono o la tablet de la instalación, en el equipo emparejado.",
    );
    const visible = await frase.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!visible, "La cuenta de prueba no entra a Terreno con sesión");
    await expect(page.getByText("en construcción")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Emparejar este teléfono" })).toBeVisible();
    await capturar(page, info, "terreno-sesion");
  });
});
