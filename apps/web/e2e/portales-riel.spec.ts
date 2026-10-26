import { expect, test } from "@playwright/test";

// Usuario selector (ERP/Supervisor): sin acceso a Trabajador ni Cliente.
// En CI falla si falta la contraseña; en local se omite.
const email = process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl";
const sinEmpresaEmail = process.env["E2E_SIN_EMPRESA_EMAIL"] ?? "e2e-sin-empresa@opai.cl";
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
          const nav = page.getByRole("navigation", { name: "Principal" });
          if (autorizado) {
            await expect(nav).toHaveCount(1);
          } else {
            // H1: sin acceso el shell se monta igual (una barra de navegación visible), con el aviso
            // dentro del marco pero sin ningún ítem de navegación del portal ajeno.
            await expect(nav.first()).toBeVisible();
            await expect(
              page.getByText("No tienes acceso a este portal en la empresa actual."),
            ).toBeVisible();
            await expect(nav.getByRole("link")).toHaveCount(0);
          }
          await expect(page).toHaveTitle(titulo);
        }
      }

      if (!autorizado) {
        // Desde un portal sin acceso hay salida: el menú de usuario cierra la sesión.
        await page.getByRole("button", { name: "Menú de usuario" }).first().click();
        await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
        await page.waitForURL((url) => url.pathname.startsWith("/login"));
      }
    });
  }

  test("sin empresa activa: aviso dentro del shell, con Elegir empresa y Cerrar sesión", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(sinEmpresaEmail);
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    // Sin empresas usables, «Elegir empresa» rebota a «/», donde se muestra el aviso.
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByText(/Aún no perteneces a ninguna empresa activa/)).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav.first()).toBeVisible();
    await expect(nav.getByRole("link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Elegir empresa" })).toBeVisible();
    await page.getByRole("button", { name: "Menú de usuario" }).first().click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/login"));
  });
});
