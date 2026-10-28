import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, entrar } from "./sesion";
import { comprobarContrasteNavegacion } from "./contraste-navegacion";
import { ocultarIndicadorDev } from "./indicador-dev";
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);
test("recuerda el área abierta en Inicio y Configuración", async ({ page }, info) => {
  test.skip(info.project.name === "telefono", "El acordeón lateral se muestra desde 1024 px");
  await ocultarIndicadorDev(page);
  await entrar(page);
  await page.goto("/configuracion");
  const nav = page.getByRole("navigation", { name: "Principal", exact: true }).filter({ visible: true });
  const personas = nav.getByRole("button", { name: "Personas", exact: true });
  const clientes = nav.getByRole("button", { name: "Clientes", exact: true });
  if (await clientes.getAttribute("aria-expanded") !== "true") await clientes.click();
  await expect(nav.locator('a[href="/cuentas"]').last().locator("..").locator('button[aria-label="Fijar"], button[aria-label="Desfijar"]')).toBeAttached();
  // Con la isla instalada, intercalar otra área garantiza una transición real a Personas.
  const estabaAbierto = await clientes.getAttribute("aria-expanded") === "true";
  await clientes.click();
  await expect(clientes).toHaveAttribute("aria-expanded", String(!estabaAbierto));
  const guardado = page.waitForResponse((r) => r.request().method() === "POST" &&
    !!r.request().postData()?.includes("navegacion_area_abierta") &&
    !!r.request().postData()?.includes('"personas"'));
  await personas.click(); expect((await guardado).ok()).toBe(true);
  await expect(personas).toHaveAttribute("aria-expanded", "true");
  await page.reload();
  await expect(personas).toHaveAttribute("aria-expanded", "true");
  await page.goto("/");
  await expect(personas).toHaveAttribute("aria-expanded", "true");
  await page.reload();
  await expect(personas).toHaveAttribute("aria-expanded", "true");
});
test("áreas, fijados, recientes, Más, preferencias y Bandeja", async ({ page }, info) => {
  await ocultarIndicadorDev(page);
  const errores: string[] = [];
  page.on("pageerror", (e) => { errores.push(e.message); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (!E2E_PASSWORD) throw new Error("Falta contraseña E2E");
  await entrar(page);
  // Estado inicial determinista incluso si una ejecución anterior se interrumpió antes de limpiar.
  await page.goto("/configuracion/preferencias");
  const segunRol = page.getByRole("radio", { name: /^Según mi rol/ });
  await segunRol.click();
  await expect(segunRol).toHaveAttribute("data-state", "checked");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bandeja · \d/ })).toBeVisible({ timeout: 15_000 });
  const nav = page
    .getByRole("navigation", { name: "Principal", exact: true })
    .filter({ visible: true });
  if (info.project.name === "telefono") {
    await expect(nav.getByRole("link", { name: "Cuentas", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Personas", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "Más opciones" }).click();
    const mas = page.getByRole("dialog", { name: "Más", exact: true });
    await expect(mas.getByText("Fijados", { exact: true })).toBeVisible();
    await mas.getByRole("button", { name: "Clientes", exact: true }).click();
    await expect(mas.getByRole("button", { name: "Instalaciones", exact: true })).toBeVisible();
    await expect(mas.getByRole("button", { name: "Configuración", exact: true })).toBeVisible();
    await expect(mas.getByText("Cuenta", { exact: true })).toBeVisible();
    await expect(mas.getByRole("button", { name: "Cerrar sesión" })).toHaveClass(/text-danger/);
    await page.keyboard.press("Escape");
    await expect(nav.getByRole("button", { name: "Más opciones" })).toBeFocused();
    // Segunda apertura con teclado: conserva el Sheet diferido y devuelve el foco al disparador.
    await page.keyboard.press("Enter");
    await expect(mas).toBeVisible();
    await page.keyboard.press("Tab");
    await expect.poll(() => mas.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(nav.getByRole("button", { name: "Más opciones" })).toBeFocused();
  } else {
    const clientes = nav.getByRole("button", { name: "Clientes", exact: true });
    if (await clientes.getAttribute("aria-expanded") !== "true") await clientes.click();
    await expect(clientes).toHaveAttribute("aria-expanded", "true");
    const personas = nav.getByRole("button", { name: "Personas", exact: true });
    await personas.click();
    await expect(personas).toHaveAttribute("aria-expanded", "true");
    await expect(clientes).toHaveAttribute("aria-expanded", "false");
    await clientes.click();
    const fila = nav.getByRole("link", { name: "Cuentas", exact: true }).last().locator("..");
    await fila.hover();
    const pin = fila.getByRole("button");
    if ((await pin.getAttribute("aria-label")) === "Desfijar") await pin.click();
    await expect(pin).toHaveAttribute("aria-label", "Fijar");
    const filaInstalaciones = nav.getByRole("link", { name: "Instalaciones", exact: true }).last().locator("..");
    await filaInstalaciones.hover();
    const pinInstalaciones = filaInstalaciones.getByRole("button");
    if ((await pinInstalaciones.getAttribute("aria-label")) === "Desfijar") await pinInstalaciones.click();
    await expect(pinInstalaciones).toHaveAttribute("aria-label", "Fijar");
    // Dos clics antes de responder el primer guardado: la segunda transformación no debe borrar la primera.
    let liberar = () => {};
    const demora = new Promise<void>((resolve) => { liberar = resolve; });
    let demorar = true;
    await page.route("**/*", async (ruta) => {
      if (demorar && ruta.request().method() === "POST" && ruta.request().postData()?.includes("navegacion_fijados")) {
        demorar = false;
        await demora;
      }
      await ruta.continue();
    });
    const guardado = page.waitForRequest((r) => r.method() === "POST" && !!r.postData()?.includes("navegacion_fijados"));
    await pin.click();
    await guardado;
    await pinInstalaciones.click();
    liberar();
    await expect(pin).toHaveAttribute("aria-label", "Desfijar");
    await expect(pinInstalaciones).toHaveAttribute("aria-label", "Desfijar");
    await page.unrouteAll({ behavior: "wait" });
    await page.reload();
    await expect(nav.getByText("Fijados", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Cuentas", exact: true }).first()).toBeVisible();
    await expect(nav.getByRole("link", { name: "Instalaciones", exact: true }).first()).toBeVisible();
  }
  // Los enlaces cliente conservan el mismo nodo del shell, incluso al aplicar preferencias diferidas.
  await nav.evaluate((el) => el.setAttribute("data-prueba-persistencia", "mismo-shell"));
  await nav.getByRole("link", { name: "Cuentas", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/cuentas$/);
  await expect(nav).toHaveAttribute("data-prueba-persistencia", "mismo-shell");
  if (info.project.name !== "telefono") {
    const personas = nav.getByRole("button", { name: "Personas", exact: true });
    if (await personas.getAttribute("aria-expanded") !== "true") await personas.click();
  }
  await nav.getByRole("link", { name: "Personas", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/personas$/);
  await expect(nav).toHaveAttribute("data-prueba-persistencia", "mismo-shell");
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((k) =>
    k.startsWith("opai_recientes_") && localStorage.getItem(k)?.includes('"/personas"'),
  ))).toBe(true);
  await page.keyboard.press("Control+k");
  const paleta = page.getByRole("dialog");
  await expect(paleta.getByText("Recientes", { exact: true })).toBeVisible();
  await expect(paleta.getByText("Acciones", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/configuracion/preferencias");
  expect(errores).toEqual([]);
  await page.getByRole("radio", { name: /^Personas/ }).click();
  await expect(page.getByRole("radio", { name: /^Personas/ })).toHaveAttribute("data-state", "checked");
  if (info.project.name === "telefono")
    await expect(nav.getByRole("link", { name: "Cargos y sueldos", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: /^Según mi rol/ }).click();
  await expect(page.getByRole("radio", { name: /^Según mi rol/ })).toHaveAttribute("data-state", "checked");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bandeja · \d/ })).toBeVisible({ timeout: 15_000 });
  await page.locator("header").getByRole("link", { name: /Notificaciones/ }).click();
  await expect(page).toHaveURL(/#bandeja$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const tema of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await comprobarContrasteNavegacion(page, 'header.sticky, nav[aria-label="Principal"], #bandeja');
    await page.screenshot({ path: info.outputPath(`navegacion-${tema}.png`), fullPage: true });
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await comprobarContrasteNavegacion(page, '[role="dialog"]');
    await page.keyboard.press("Escape");
  }
});
