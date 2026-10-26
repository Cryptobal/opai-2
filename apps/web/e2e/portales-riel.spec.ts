import { expect, test } from "@playwright/test";

// Usuario selector (ERP/Supervisor): sin acceso a Trabajador ni Cliente.
// En CI falla si falta la contraseña; en local se omite.
const email = process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

const PORTALES = [
  { id: "trabajador", nombre: "Trabajador" },
  { id: "cliente", nombre: "Cliente" },
] as const;

test.describe("acceso a portales", () => {
  test.beforeEach(() => {
    if (password) return;
    if (process.env["CI"]) throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI");
    test.skip(true, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  for (const autorizado of [false, true]) {
    test(`${autorizado ? "con" : "sin"} acceso: navegación y título del 404`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto("/login");
      await page
        .getByLabel("Correo")
        .fill(autorizado ? (process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl") : email);
      await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"));
      if (new URL(page.url()).pathname === "/elegir-empresa") {
        await page.getByRole("button", { name: /Gard Security/ }).click();
      }
      await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");

      for (const p of PORTALES) {
        const paginas = [
          { ruta: `/${p.id}`, titulo: `Inicio · Portal ${p.nombre} · OPAI` },
          { ruta: `/${p.id}/esto-no-existe`, titulo: `No encontrado · Portal ${p.nombre} · OPAI` },
        ];
        for (const { ruta, titulo } of paginas) {
          await page.goto(ruta);
          const riel = page.getByRole("navigation", { name: "Principal" });
          if (autorizado) {
            await expect(riel).toHaveCount(1);
          } else {
            await expect(riel).toHaveCount(0);
            await expect(
              page.getByText("No tienes acceso a este portal en la empresa actual."),
            ).toBeVisible();
          }
          await expect(page).toHaveTitle(titulo);
        }
      }
    });
  }
});
