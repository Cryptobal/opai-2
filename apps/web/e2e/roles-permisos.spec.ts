import { execFileSync } from "node:child_process";

import { type Browser, expect, type Page, test, type TestInfo } from "@playwright/test";

import { diagnosticarSiFalla } from "./diagnostico";
import { hidratado } from "./hidratacion";
import { E2E_PASSWORD, entrar } from "./sesion";

// Configuración → Usuarios y permisos, bloque 6 del Brief 07c (CAR-37): roles personalizados, matriz
// editable, asignación del rol al editar un usuario, excepciones y `/api/v1` con sesión. Las
// lecturas se prueban a 375, 1024 y 1280; la escritura de punta a punta una vez (iPad).

const USUARIO = "roles-e2e@opai.cl";

async function captura(page: Page, nombre: string, info: TestInfo) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  // Con una hoja abierta, solo la pantalla: la página completa mezcla el overlay con el fondo.
  const hojaAbierta = (await page.getByRole("dialog").count()) > 0;
  await page.mouse.move(0, 0);
  for (const tema of ["claro", "oscuro"]) {
    await page.evaluate(
      (t) => document.documentElement.setAttribute("data-theme", t === "oscuro" ? "dark" : "light"),
      tema,
    );
    // Las filas y controles animan el color 150 ms al cambiar de tema: se espera a que terminen.
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `e2e/__screenshots__/roles-${nombre}-${tema}-${info.project.name}.png`,
      fullPage: !hojaAbierta,
    });
  }
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
}

const hoja = (page: Page, nombre: string | RegExp) => page.getByRole("dialog", { name: nombre });

async function comoUsuario(browser: Browser, ruta: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(USUARIO);
  await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto(ruta);
  return { page, cerrar: () => contexto.close() };
}

test.describe("configuración · roles y permisos (CAR-37)", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.afterEach(({ page }, info) => diagnosticarSiFalla(page, info));
  test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion: "reduce" }));

  test("pestaña Roles, equivalencia 1.0 y matriz de un rol del sistema", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/usuarios/roles");
    await expect(page.getByText("Del sistema", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Si vienes de OPAI 1.0")).toBeVisible();
    await expect(page.getByText("central_monitoreo")).toBeVisible();
    await captura(page, "lista", info);
    // Por href: otros specs crean roles personalizados que también empiezan con «Supervisor».
    await page.locator('a[href="?rol=sistema%3Asupervisor"]').click();
    const detalle = hoja(page, "Supervisor");
    await expect(detalle.getByText("Los roles del sistema no se editan")).toBeVisible();
    const ver = detalle.getByRole("checkbox", { name: "Ver Instalaciones" });
    await expect(ver).toBeChecked();
    await expect(ver).toBeDisabled();
    await captura(page, "sistema", info);
  });

  test("crear un rol, asignarlo con una excepción y archivarlo", async ({ page, browser }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    execFileSync("pnpm", ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-roles-e2e.ts"], {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, E2E_PASSWORD: E2E_PASSWORD ?? "" },
      stdio: "inherit",
    });
    const nombre = `Central E2E ${Date.now().toString(36)}`;
    await entrar(page);

    // 1. Nuevo rol con permisos de lectura (A3).
    await page.goto("/configuracion/usuarios/roles?nuevo=1");
    const nuevo = hoja(page, "Nuevo rol");
    // Con el formulario sin hidratar, lo que se escribe y marca se pierde al hidratar (y el aviso no llega).
    await hidratado(nuevo.getByRole("button", { name: "Crear rol" }));
    await nuevo.getByLabel("Nombre del rol").fill(nombre);
    await nuevo.getByLabel("Descripción (opcional)").fill("Monitoreo de instalaciones");
    for (const p of ["Ver Instalaciones", "Ver Personas", "Ver Documentos"]) await nuevo.getByRole("checkbox", { name: p, exact: true }).click();
    await captura(page, "nuevo", info);
    await nuevo.getByRole("button", { name: "Crear rol" }).click();
    await expect(page.getByText("Rol creado")).toBeVisible();

    // 2. Editar la matriz: contador de cambios y guardar (A2).
    const rol = hoja(page, nombre);
    await rol.getByRole("checkbox", { name: "Ver Auditoría" }).click();
    await expect(rol.getByText("1 cambio sin guardar")).toBeVisible();
    await rol.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Rol actualizado")).toBeVisible();

    // 3. Asignar el rol personalizado al editar un usuario (A4 §1).
    await page.goto("/configuracion/usuarios");
    await page.getByRole("link", { name: /Roles E2E/ }).click();
    await page.waitForURL(/editar=/);
    const ficha = hoja(page, "Roles E2E");
    const membershipId = new URL(page.url()).searchParams.get("editar");
    await ficha.getByLabel("Rol", { exact: true }).click();
    await page.getByRole("option", { name: nombre }).click();
    await expect(ficha.getByText(/Instalaciones: ver/)).toBeVisible();
    await ficha.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Usuario actualizado")).toBeVisible();
    await expect(page.getByRole("cell", { name: nombre })).toBeVisible();

    // 4. Excepción concedida con motivo (A4 §3).
    await page.goto(`/configuracion/usuarios?editar=${membershipId}`);
    await ficha.getByRole("button", { name: "Agregar excepción" }).click();
    const exc = hoja(page, "Agregar excepción");
    await exc.getByLabel("Permiso").click();
    await page.getByRole("option", { name: /Gestionar Documentos/ }).click();
    await exc.getByLabel("Motivo").fill("Carga de certificados OS-10 de la central");
    await exc.getByRole("button", { name: "Guardar excepción" }).click();
    await expect(page.getByText("Permiso concedido")).toBeVisible();
    await expect(ficha.getByText("Concedido", { exact: true })).toBeVisible();
    await captura(page, "ficha", info);

    // 5. `/api/v1` con sesión: las de roles y permisos corren en el ERP; el resto sigue cerrado.
    const origin = new URL(page.url()).origin;
    const lista = await page.request.get(
      `/api/v1/core/excepciones/list?input=${encodeURIComponent(JSON.stringify({ membershipId }))}`,
      { headers: { origin } },
    );
    expect(lista.status()).toBe(200);
    expect((await lista.json()).data).toMatchObject([
      { permiso: "core:documentos.manage", conceder: true },
    ]);
    const roles = await page.request.post("/api/v1/core/roles/list", {
      data: { input: {} },
      headers: { origin },
    });
    expect(roles.status()).toBe(200);
    const ajeno = await page.request.post("/api/v1/core/roles/list", {
      data: { input: {} },
      headers: { origin: "https://otro.example" },
    });
    expect(ajeno.status()).toBe(403);
    const fuera = await page.request.get("/api/v1/core/cuentas/list?input=%7B%7D", {
      headers: { origin },
    });
    expect(fuera.status()).toBe(403);

    // 6. El rol manda de verdad: sin «Ver Cuentas», el usuario ya no ve Cuentas (viewer sí las veía).
    const usuario = await comoUsuario(browser, "/cuentas");
    await expect(usuario.page.getByText(/No tienes acceso/).first()).toBeVisible();
    await usuario.page.goto("/instalaciones");
    await expect(usuario.page.getByText(/No tienes acceso/)).toHaveCount(0);
    await usuario.cerrar();

    // 7. Un rol en uso no se archiva; se reasigna y se archiva (A3).
    await ficha.getByRole("button", { name: "Quitar Gestionar Documentos" }).click();
    await expect(page.getByText("Excepción quitada")).toBeVisible();
    await page.goto("/configuracion/usuarios/roles");
    await page.getByRole("link", { name: new RegExp(`^${nombre}`) }).click();
    await rol.getByRole("button", { name: `Acciones del rol ${nombre}` }).click();
    await page.getByRole("menuitem", { name: "Archivar rol" }).click();
    await expect(page.getByRole("dialog", { name: /No puedes archivar/ })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.goto(`/configuracion/usuarios?editar=${membershipId}`);
    await ficha.getByLabel("Rol", { exact: true }).click();
    await page.getByRole("option", { name: "Solo lectura", exact: true }).click();
    await ficha.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Usuario actualizado")).toBeVisible();
    await page.goto("/configuracion/usuarios/roles");
    await page.getByRole("link", { name: new RegExp(`^${nombre}`) }).click();
    await rol.getByRole("button", { name: `Acciones del rol ${nombre}` }).click();
    await page.getByRole("menuitem", { name: "Archivar rol" }).click();
    await page.getByRole("button", { name: "Archivar", exact: true }).click();
    await expect(page.getByText("Rol archivado")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`^${nombre}`) })).toHaveCount(0);
  });
});
