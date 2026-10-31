import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, entrar } from "./sesion";

// Tickets · PR 1 (CAR-84) — evidencia visual de la Bandeja y, si hay datos sembrados, de la Ficha, a
// 375, 1024 y 1280 px (proyectos de playwright.config). El PR 1 no trae la pantalla "Nuevo ticket"
// (va al PR 2, ver BRIEF-13 §2): sin seed de tickets, la bandeja queda en su estado vacío, que
// también es parte de lo que este spec verifica. El login comparte sesion.ts (contraseña y TOTP).
test.setTimeout(90_000);

test.describe("Tickets · bandeja y ficha", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("bandeja: vacío o con tickets, y ficha si hay alguno", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" }).first()).toBeVisible();
    await page.screenshot({ path: info.outputPath("tickets-bandeja.png"), fullPage: true });

    const primero = page.locator('a[href^="/tickets/"]').first();
    if (await primero.count()) {
      await primero.click();
      await page.waitForURL(/\/tickets\/[0-9a-f-]{36}/);
      await expect(page.getByText("Línea de tiempo", { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath("tickets-ficha.png"), fullPage: true });
    } else {
      await expect(page.getByText("Sin tickets", { exact: true })).toBeVisible();
    }
  });
});
