import { expect, test } from "@playwright/test";

// Riel y título de pestaña de los portales Trabajador y Cliente en escritorio (1280 px, QA del #21).
// Requiere E2E_PORTALES_EMAIL y E2E_PORTALES_PASSWORD (sin ellas se omite). Basta un usuario con
// sesión: sin acceso al portal, el shell se monta igual (con «Sin permisos»).
const email = process.env["E2E_PORTALES_EMAIL"];
const password = process.env["E2E_PORTALES_PASSWORD"];

const PORTALES = [
  { id: "trabajador", nombre: "Trabajador" },
  { id: "cliente", nombre: "Cliente" },
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
      const paginas = [
        { ruta: `/${p.id}`, titulo: `Inicio · Portal ${p.nombre} · OPAI` },
        { ruta: `/${p.id}/esto-no-existe`, titulo: `No encontrado · Portal ${p.nombre} · OPAI` },
      ];
      for (const { ruta, titulo } of paginas) {
        await page.goto(ruta);
        const riel = page.getByRole("navigation", { name: "Principal" });
        await expect(riel.getByText("OPAI", { exact: true })).toBeVisible();
        await expect(riel.getByText(p.nombre, { exact: true })).toBeVisible();
        await expect(page).toHaveTitle(titulo);
      }
    }
  });
});
