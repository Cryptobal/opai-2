import { expect, test } from "@playwright/test";
import { ocultarIndicadorDev } from "./indicador-dev";

import { codigoTotp, E2E_PASSWORD as password, entrar } from "./sesion";

// Riel y título de pestaña de los portales Trabajador y Cliente en escritorio (1280 px, QA del #21).
// Usa el usuario plataforma que el job e2e ya siembra, con SEED_OWNER_PASSWORD (como plataforma.spec).
// Basta un usuario con sesión: sin acceso al portal, el shell se monta igual (con «Sin permisos»).
// En CI falla si falta la contraseña; en local se omite.
// Usuario selector (ERP/Supervisor): sin acceso a Trabajador ni Cliente. El usuario «con acceso» es
// el de plataforma que el job e2e siembra con SEED_OWNER_PASSWORD. En CI falla si falta la contraseña.
const email = process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl";
const sinEmpresaEmail = process.env["E2E_SIN_EMPRESA_EMAIL"] ?? "e2e-sin-empresa@opai.cl";
const sinErpEmail = process.env["E2E_SIN_ERP_EMAIL"] ?? "e2e-sin-erp@opai.cl";

const PORTALES = [
  { id: "trabajador", nombre: "Trabajador" },
  { id: "cliente", nombre: "Cliente" },
] as const;

test.describe("acceso a portales", () => {
  // El badge de dev de Next tapa controles del pie y se traga los clics (`indicador-dev.ts`).
  test.beforeEach(({ context }) => ocultarIndicadorDev(context));
  test.beforeEach(() => {
    if (password) return;
    if (process.env["CI"]) throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD en CI");
    test.skip(true, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  });

  for (const autorizado of [false, true]) {
    test(`${autorizado ? "con" : "sin"} acceso: shell, nombre del portal y título del 404`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await entrar(page, autorizado ? undefined : email);
      if (new URL(page.url()).pathname === "/elegir-empresa") {
        await page.getByRole("button", { name: /Gard Security/ }).click();
      }

      for (const p of PORTALES) {
        const paginas = [
          { ruta: `/${p.id}`, titulo: `Inicio · Portal ${p.nombre} · OPAI` },
          { ruta: `/${p.id}/esto-no-existe`, titulo: `No encontrado · Portal ${p.nombre} · OPAI` },
        ];
        for (const { ruta, titulo } of paginas) {
          await page.goto(ruta);
          const nav = page.getByRole("navigation", { name: "Principal" });
          await expect(nav.first()).toBeVisible();
          // El selector nombra el portal actual, también sin acceso (ADR-050 + `conPortalActual`, #54).
          await expect(
            page.getByRole("button", { name: new RegExp(`portal ${p.nombre}`) }).first(),
          ).toBeVisible();
          if (autorizado) {
            await expect(nav.getByRole("link").first()).toBeVisible();
          } else {
            // H1: sin acceso el shell se monta igual, con el aviso dentro del marco y sin ningún ítem
            // de navegación del portal ajeno.
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

  test("ERP sin acceso (empresa pero sin el portal): sin búsqueda ni Preferencias, con salida", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(sinErpEmail);
    await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    if (new URL(page.url()).pathname === "/mfa") {
      await page.getByLabel(/Código/).fill(await codigoTotp());
      await page.getByRole("button", { name: "Verificar" }).click();
      await page.waitForURL((url) => url.pathname !== "/mfa");
    }
    // El ERP es su inicio sin acceso: el shell se monta con el aviso dentro del marco.
    await page.goto("/");
    await expect(
      page.getByText("No tienes acceso a este portal en la empresa actual."),
    ).toBeVisible();
    // N1: sin acceso al ERP no hay búsqueda ni ⌘K (el disparador de Buscar no se monta).
    await expect(page.getByRole("button", { name: /Buscar/ })).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    if (testInfo.project.name !== "telefono") {
      await expect(page.getByRole("heading", { level: 1, name: "Sin permisos" })).toBeVisible();
    }
    // N2: el menú de usuario no ofrece Preferencias, pero conserva la salida.
    const menuUsuario = page.getByRole("button", { name: "Menú de usuario" }).first();
    const salir = page.getByRole("menuitem", { name: "Cerrar sesión" });
    await expect(async () => {
      if (!(await salir.isVisible())) await menuUsuario.click();
      await expect(salir).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page.getByRole("menuitem", { name: "Preferencias" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/login"));
  });

  test("sin empresa activa: sin enlace circular, con título y Cerrar sesión", async ({
    page,
  }, testInfo) => {
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
    await expect(page.getByRole("link", { name: "Elegir empresa" })).toHaveCount(0);
    if (testInfo.project.name !== "telefono") {
      await expect(page.getByRole("heading", { level: 1, name: "Sin permisos" })).toBeVisible();
    }
    for (const tema of ["light", "dark"]) {
      await page.locator("html").evaluate((html, valor) => {
        html.classList.toggle("dark", valor === "dark");
      }, tema);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath(`sin-empresa-${tema}.png`) });
    }
    await page.getByRole("button", { name: "Menú de usuario" }).first().click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/login"));
  });
});
