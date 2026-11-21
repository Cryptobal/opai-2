import { expect, test } from "@playwright/test";

import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-746: el selector de portal solo muestra portales que la cuenta puede usar de verdad.
test.describe("@preview selector de portal por perfil", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  test.setTimeout(120_000);

  test("owner de qa-e2e: entrar sin Terreno ni Cliente en la lista", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/entrar");
    await expect(page.getByRole("heading", { name: "Entrar a OPAI" })).toBeVisible({
      timeout: 60_000,
    });
    const botones = page.getByRole("button");
    const etiquetas = await botones.allTextContents();
    expect(etiquetas).not.toEqual(expect.arrayContaining(["Cliente", "Terreno"]));
    await capturar(page, info, "selector-portales-entrar");
    expect(etiquetas.some((t) => t.includes("ERP"))).toBe(true);
  });
});