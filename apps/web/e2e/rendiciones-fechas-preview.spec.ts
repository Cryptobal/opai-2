import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-368 (parte Rendiciones): el rango de fechas de la bandeja del aprobador usa el campo de fecha del DS,
// que se ve y se escribe como dd-mm-aaaa aunque el navegador esté en inglés. Solo lee: no aprueba nada.
test.setTimeout(120_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
test.skip(!EN_PREVIEW, "Usa la empresa ficticia qa-e2e");

test.describe("@preview rendiciones: fechas en formato chileno", () => {
  test("la bandeja filtra por fecha escrita como dd-mm-aaaa", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/rendiciones/bandeja");
    const desde = page.getByRole("textbox", { name: "Enviada desde" });
    await expect(desde).toBeVisible({ timeout: 60_000 });
    await expect(desde).toHaveAttribute("placeholder", "dd-mm-aaaa");
    await expect(page.getByRole("textbox", { name: "Enviada hasta" })).toHaveAttribute("placeholder", "dd-mm-aaaa");
    await hidratado(desde);
    await desde.fill("01112026");
    await expect(desde).toHaveValue("01-11-2026");
    await expect(page).toHaveURL(/desde=2026-11-01/, { timeout: 30_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturar(page, info, "rendiciones-bandeja-fechas");
  });
});
