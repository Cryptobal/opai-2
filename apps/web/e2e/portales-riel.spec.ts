import { expect, test } from "@playwright/test";

// Riel y título de pestaña de los portales Trabajador y Cliente en escritorio (1280 px, QA del #21).
// Requiere un usuario con membresía en ambos portales (E2E_PORTALES_EMAIL / E2E_PORTALES_PASSWORD).
const email = process.env["E2E_PORTALES_EMAIL"] ?? process.env["E2E_EMAIL"];
const password = process.env["E2E_PORTALES_PASSWORD"] ?? process.env["E2E_PASSWORD"];

const PORTALES = [
  { id: "trabajador", subtitulo: "Trabajador", titulo: "No encontrado · Portal Trabajador" },
  { id: "cliente", subtitulo: "Cliente", titulo: "No encontrado · Portal Cliente" },
] as const;

test.describe("portales en escritorio", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1280, "Solo escritorio (1280 px)");
  test.skip(!email || !password, "Faltan E2E_PORTALES_EMAIL y E2E_PORTALES_PASSWORD");

  test("el riel nombra el portal y el 404 lleva su título", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email ?? "");
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    for (const p of PORTALES) {
      await page.goto(`/${p.id}/esto-no-existe`);
      const riel = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
      await expect(riel.getByText("OPAI", { exact: true })).toBeVisible();
      await expect(riel.getByText(p.subtitulo, { exact: true })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(`^${p.titulo}`));
    }
  });
});
