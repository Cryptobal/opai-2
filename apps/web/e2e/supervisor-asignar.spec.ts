import { execFileSync } from "node:child_process";
import { type Browser, expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { entrar } from "./sesion";

// CAR-38 · asignar instalaciones a un supervisor de punta a punta: la asigna un owner desde la
// ficha del usuario, el supervisor la ve en su portal, el owner la quita desde la ficha de la
// instalación y el supervisor vuelve a ver la lista vacía. Un supervisor por proyecto (sin choques
// entre los tres viewports); la fixture deja su alcance vacío al empezar.
const INSTALACION = "00000000-0000-7000-8000-000000000091";
const NOMBRE_INST = "Instalación asignable E2E";

test.beforeAll(() => {
  const info = test.info();
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta contraseña E2E");
  execFileSync(
    "pnpm",
    ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-supervisor-asignar-e2e.ts"],
    {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, E2E_PASSWORD: password, E2E_PROYECTO: info.project.name },
      stdio: "inherit",
    },
  );
});

/** Sesión del supervisor en un contexto aparte, con el mismo viewport del proyecto. */
async function portalSupervisor(browser: Browser, email: string): Promise<Page> {
  const use = test.info().project.use;
  const ctx = await browser.newContext({
    ...(use.baseURL ? { baseURL: use.baseURL } : {}),
    ...(use.viewport ? { viewport: use.viewport } : {}),
    ...(use.isMobile !== undefined ? { isMobile: use.isMobile } : {}),
    ...(use.hasTouch !== undefined ? { hasTouch: use.hasTouch } : {}),
  });
  const page = await ctx.newPage();
  await entrar(page, email);
  return page;
}

/**
 * La lista del portal tras cada cambio. Se recarga en cada intento: en CI (`pnpm dev`, un worker)
 * la primera compilación de la ruta puede tardar más que la espera de un `expect`.
 */
async function verInstalaciones(sup: Page, asignada: boolean) {
  await expect(async () => {
    await sup.goto("/supervisor/instalaciones");
    if (asignada) await expect(sup.getByText(NOMBRE_INST).first()).toBeVisible({ timeout: 10_000 });
    else {
      await expect(sup.getByText("Sin instalaciones activas", { exact: true })).toBeVisible({
        timeout: 10_000,
      });
      await expect(sup.getByText(NOMBRE_INST)).toHaveCount(0);
    }
  }).toPass({ timeout: 60_000 });
}

test("asignar, ver solo lo asignado en el portal, quitar y volver a vacío", async ({
  page,
  browser,
}, info) => {
  // Cinco pasos con dos sesiones y varias rutas que compilan en frío en el runner: pasa de los 90 s por defecto.
  test.setTimeout(240_000);
  const proyecto = info.project.name;
  const email = `supervisor-asignar-${proyecto}@opai.cl`;
  const nombre = `Supervisor asignable ${proyecto}`;
  const sup = await portalSupervisor(browser, email);
  await verInstalaciones(sup, false);

  // 1 · Asignar desde la ficha del usuario (Configuración → Usuarios).
  await entrar(page);
  await page.goto("/configuracion/usuarios");
  const fila = page.getByRole("link", { name: new RegExp(nombre) });
  await hidratado(fila);
  await fila.click();
  const hoja = page.getByRole("dialog", { name: nombre });
  await expect(hoja).toBeVisible({ timeout: 30_000 });
  await expect(
    hoja.getByText("Sin instalaciones a cargo: en su portal verá listas vacías."),
  ).toBeVisible();
  const buscador = hoja.getByRole("button", { name: "Asignar instalaciones" });
  await hidratado(buscador);
  await buscador.click();
  await page.getByRole("combobox").last().fill("asignable E2E");
  await page.getByRole("option", { name: new RegExp(NOMBRE_INST) }).click();
  await page.keyboard.press("Escape");
  await hoja.getByRole("button", { name: "Asignar", exact: true }).click();
  await expect(hoja.getByRole("button", { name: `Quitar ${NOMBRE_INST}` })).toBeVisible();
  await page.screenshot({ path: info.outputPath("usuario-a-cargo.png"), fullPage: true });

  // 2 · El supervisor ve solo esa instalación (el filtro está en la consulta de la capacidad).
  await verInstalaciones(sup, true);

  // 3 · /api/v1 con sesión: fuera de la lista de CAR-37 no fija portal (403) y una escritura de
  // otro origen se corta antes; ninguna de las dos escribe.
  const cuerpo = { input: { membershipId: INSTALACION, instalacionIds: [INSTALACION] } };
  const ajeno = await page.request.post("/api/v1/core/supervisores/quitar", {
    headers: { origin: "https://ajeno.example" },
    data: cuerpo,
  });
  expect(ajeno.status()).toBe(403);
  expect(await ajeno.json()).toMatchObject({ error: { message: "Origen no permitido." } });
  const propio = await page.request.post("/api/v1/core/supervisores/quitar", {
    headers: { origin: new URL(page.url()).origin },
    data: cuerpo,
  });
  expect(propio.status()).toBe(403);
  expect(await propio.json()).toMatchObject({
    error: { message: "No tienes acceso a este portal." },
  });
  await verInstalaciones(sup, true);

  // 4 · Quitar desde la ficha de la instalación.
  await page.goto(`/instalaciones/${INSTALACION}`);
  await expect(page.getByRole("heading", { name: "Supervisores a cargo" })).toBeVisible();
  const quitar = page.getByRole("button", { name: `Quitar ${nombre}` });
  await hidratado(quitar);
  await quitar.click();
  await expect(quitar).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("instalacion-supervisores.png"), fullPage: true });

  // 5 · El supervisor vuelve a ver vacío.
  await verInstalaciones(sup, false);
  await sup.context().close();
});
