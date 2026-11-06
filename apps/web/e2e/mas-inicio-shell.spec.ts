import { execFileSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { entrar } from "./sesion";

// Regresión de CAR-182 en el SHELL REAL (no solo /ds): la hoja «Más» del teléfono trae su campo de
// búsqueda y los recientes, y Inicio muestra sus bloques. Si alguien corta la cadena de props
// marco-shell → AppShell → BottomNav → MenuMas → ContenidoMas, estas pruebas fallan.

// «Inicio con un rol limitado» entra con `nav-deniega@opai.cl`, que crea `seed-nav-permisos-e2e` (el
// mismo que usa navegacion-permisos). Sin sembrarlo aquí, en una base limpia esta prueba corre antes
// que esa (orden alfabético) y el login nunca navega (CAR-199).
test.beforeAll(() => {
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta contraseña E2E");
  execFileSync(
    "pnpm",
    ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-nav-permisos-e2e.ts"],
    {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, E2E_PASSWORD: password },
      stdio: "inherit",
    },
  );
});

async function abrirMas(page: Page) {
  const boton = page.getByRole("button", { name: "Más opciones" });
  await hidratado(boton);
  await boton.click();
  const hoja = page.getByRole("dialog");
  await expect(hoja).toBeVisible();
  return hoja;
}

/** «Tus accesos» sale del esqueleto cuando el shell termina de cargar los fijados. */
async function accesosCargados(page: Page) {
  await expect(
    page
      .locator("section", { has: page.getByRole("heading", { name: "Tus accesos" }) })
      .locator(".ds-shimmer"),
  ).toHaveCount(0, { timeout: 30_000 });
}

test.describe("«Más» del teléfono en el shell real", () => {
  test.beforeEach(({ viewport }) => test.skip((viewport?.width ?? 0) > 500, "solo teléfono"));

  test("trae el campo de búsqueda y los resultados salen en la misma hoja", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/");
    const hoja = await abrirMas(page);
    const campo = hoja.getByRole("searchbox", { name: "Buscar o ir a" });
    await expect(campo).toBeVisible();
    await campo.fill("cuent");
    await expect(hoja.getByRole("button", { name: "Cancelar" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(campo).toHaveValue("cuent");
    // Los resultados (o «No encontramos…») salen dentro de la misma hoja, sin abrir otra capa.
    await expect(hoja.getByText(/Cuentas|Módulos|No encontramos/).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(400); // la hoja termina de subir
    await page.screenshot({ path: info.outputPath("mas-busqueda.png") });
  });

  test("Cancelar y Escape vuelven al menú con la misma área abierta y el mismo scroll", async ({
    page,
  }) => {
    await entrar(page);
    await page.goto("/");
    const hoja = await abrirMas(page);
    const areas = hoja.getByRole("navigation", { name: "Áreas" });
    const finanzas = areas.getByRole("button", { name: /Finanzas/ });
    if ((await finanzas.getAttribute("aria-expanded")) !== "true") await finanzas.click();
    await expect(finanzas).toHaveAttribute("aria-expanded", "true");
    await areas.evaluate((n) => n.scrollTo(0, 60));
    const scroll = await areas.evaluate((n) => n.scrollTop);
    const campo = hoja.getByRole("searchbox", { name: "Buscar o ir a" });
    await campo.fill("pers");
    await hoja.getByRole("button", { name: "Cancelar" }).click();
    await expect(finanzas).toHaveAttribute("aria-expanded", "true");
    expect(Math.abs((await areas.evaluate((n) => n.scrollTop)) - scroll)).toBeLessThanOrEqual(2);
    await campo.fill("pers");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(finanzas).toHaveAttribute("aria-expanded", "true");
  });

  test("tras visitar una página fuera de la barra inferior, aparece en recientes", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/instalaciones");
    await expect
      .poll(() => page.evaluate(() => Object.values(localStorage).join("|")), { timeout: 15_000 })
      .toContain("/instalaciones");
    await page.goto("/");
    const hoja = await abrirMas(page);
    const recientes = hoja.getByRole("region", { name: "Fijados y recientes" });
    await expect(recientes.getByRole("link", { name: /Instalaciones/ })).toBeVisible();
    await expect(recientes).not.toContainText("Aquí aparecen las páginas");
    await page.waitForTimeout(400);
    await page.screenshot({ path: info.outputPath("mas-recientes.png") });
  });
});

for (const tema of ["light", "dark"] as const) {
  test(`Inicio completo (${tema})`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: tema });
    await entrar(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /(Hola|Buenos días|Buenas tardes|Buenas noches), / }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tus accesos" })).toBeVisible();
    await accesosCargados(page);
    await expect(page.getByRole("button", { name: "Crear" })).toBeVisible();
    // Los indicadores son enlaces a su lista.
    const indicadores = page.getByRole("region", { name: "Indicadores" });
    await expect(indicadores.getByRole("link").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Requiere tu decisión hoy" })).toBeVisible();
    // Sin desborde horizontal a ningún ancho.
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(desborde).toBeLessThanOrEqual(0);
    await page.screenshot({ path: info.outputPath(`inicio-${tema}.png`), fullPage: true });
  });
}

test("Inicio con un rol limitado solo muestra lo permitido", async ({ page }, info) => {
  await entrar(page, "nav-deniega@opai.cl");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tus accesos" })).toBeVisible();
  await accesosCargados(page);
  await expect(page.getByRole("heading", { name: /Prohibido|Sin permisos/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("inicio-rol-limitado.png"), fullPage: true });
});
