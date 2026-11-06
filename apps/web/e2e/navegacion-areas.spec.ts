import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, entrar } from "./sesion";
import { comprobarContrasteNavegacion } from "./contraste-navegacion";
import { ocultarIndicadorDev } from "./indicador-dev";
test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);
test("áreas, fijados, recientes, Más, preferencias y Bandeja", async ({ page }, info) => {
  await ocultarIndicadorDev(page);
  const errores: string[] = [];
  page.on("pageerror", (e) => {
    errores.push(e.message);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (!E2E_PASSWORD) throw new Error("Falta contraseña E2E");
  await entrar(page);
  await page.goto("/mi-cuenta/preferencias");
  const segunRol = page.getByRole("radio", { name: /^Según mi rol/ });
  await segunRol.click();
  await expect(segunRol).toHaveAttribute("data-state", "checked");
  // La Bandeja vive solo en /bandeja (CAR-182): Inicio ya no la repite.
  await page.goto("/bandeja");
  await expect(page.getByRole("heading", { name: /^Bandeja · \d/ })).toBeVisible({ timeout: 15_000 });
  // Navegar antes de que la Bandeja termine de hidratar deja a React hidratando /cuentas contra el HTML de /bandeja.
  await page.waitForLoadState("networkidle");
  const nav = page
    .getByRole("navigation", { name: "Principal", exact: true })
    .filter({ visible: true });
  if (info.project.name === "telefono") {
    await expect(nav.getByRole("link", { name: "Bandeja", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Personas", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "Más opciones" }).click();
    const mas = page.getByRole("dialog", { name: "Más", exact: true });
    await expect(mas.getByRole("heading", { name: "Fijados y recientes", exact: true })).toBeVisible();
    await expect(mas.getByRole("link", { name: "Instalaciones", exact: true }).last()).toBeVisible();
    await expect(mas.getByRole("link", { name: "Configuración", exact: true }).last()).toBeVisible();
    await expect(mas.getByText("Cuenta", { exact: true })).toHaveCount(0);
    await expect(mas.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(nav.getByRole("button", { name: "Más opciones" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(mas).toBeVisible();
    await page.keyboard.press("Tab");
    await expect.poll(() => mas.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    // Con el foco en el buscador el primer Escape solo cancela la búsqueda (CAR-182); el siguiente cierra.
    await expect(async () => {
      if (await mas.isVisible()) await page.keyboard.press("Escape");
      await expect(mas).toBeHidden({ timeout: 1_000 });
    }).toPass();
    await expect(nav.getByRole("button", { name: "Más opciones" })).toBeFocused();
  } else {
    const clientes = nav.getByRole("button", { name: "Comercial", exact: true });
    if ((await clientes.getAttribute("aria-expanded")) !== "true") await clientes.click();
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
    const filaNegocios = nav.getByRole("link", { name: "Negocios", exact: true }).last().locator("..");
    await filaNegocios.hover();
    const pinNegocios = filaNegocios.getByRole("button");
    if ((await pinNegocios.getAttribute("aria-label")) === "Desfijar") await pinNegocios.click();
    await expect(pinNegocios).toHaveAttribute("aria-label", "Fijar");
    let liberar = () => {};
    const demora = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    let demorar = true;
    await page.route("**/*", async (ruta) => {
      if (
        demorar &&
        ruta.request().method() === "POST" &&
        ruta.request().postData()?.includes("navegacion_fijados")
      ) {
        demorar = false;
        await demora;
      }
      await ruta.continue();
    });
    const guardado = page.waitForRequest(
      (r) => r.method() === "POST" && !!r.postData()?.includes("navegacion_fijados"),
    );
    await pin.click();
    await guardado;
    await pinNegocios.click();
    liberar();
    await expect(pin).toHaveAttribute("aria-label", "Desfijar");
    await expect(pinNegocios).toHaveAttribute("aria-label", "Desfijar");
    await page.unrouteAll({ behavior: "wait" });
    await page.reload();
    await expect(nav.getByText("Fijados", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Cuentas", exact: true }).first()).toBeVisible();
    await expect(nav.getByRole("link", { name: "Negocios", exact: true }).first()).toBeVisible();
  }
  await nav.evaluate((el) => el.setAttribute("data-prueba-persistencia", "mismo-shell"));
  if (info.project.name === "telefono") {
    await nav.getByRole("button", { name: "Más opciones" }).click();
    // En Más las áreas con varias entradas son acordeones plegados (CAR-182): se abre Comercial.
    const masMovil = page.getByRole("dialog", { name: "Más", exact: true });
    await masMovil.getByRole("button", { name: /^Comercial/ }).click();
    await masMovil.getByRole("link", { name: "Cuentas", exact: true }).first().click();
  } else await nav.getByRole("link", { name: "Cuentas", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/cuentas$/);
  await expect(nav).toHaveAttribute("data-prueba-persistencia", "mismo-shell");
  if (info.project.name !== "telefono") {
    const personas = nav.getByRole("button", { name: "Personas", exact: true });
    if ((await personas.getAttribute("aria-expanded")) !== "true") await personas.click();
  }
  await nav.getByRole("link", { name: "Personas", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/personas$/);
  await expect(nav).toHaveAttribute("data-prueba-persistencia", "mismo-shell");
  await expect.poll(() =>
    page.evaluate(() =>
      Object.keys(localStorage).some(
        (k) => k.startsWith("opai_recientes_") && localStorage.getItem(k)?.includes('"/personas"'),
      ),
    ),
  ).toBe(true);
  await page.keyboard.press("Control+k");
  const paleta = page.getByRole("dialog");
  await expect(paleta.getByText("Recientes", { exact: true })).toBeVisible();
  await expect(paleta.getByText("Acciones", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/mi-cuenta/preferencias");
  expect(errores).toEqual([]);
  await page.getByRole("radio", { name: /^Personas/ }).click();
  await expect(page.getByRole("radio", { name: /^Personas/ })).toHaveAttribute("data-state", "checked");
  // La barra inferior sigue el área elegida: Inicio · Personas · Remuneraciones · Más (CAR-182).
  if (info.project.name === "telefono") {
    await expect(nav.getByRole("link", { name: "Remuneraciones", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Solicitudes", exact: true })).toHaveCount(0);
  }
  await page.getByRole("radio", { name: /^Según mi rol/ }).click();
  await expect(page.getByRole("radio", { name: /^Según mi rol/ })).toHaveAttribute("data-state", "checked");
  // La Bandeja vive solo en /bandeja (CAR-182): Inicio ya no la repite.
  await page.goto("/bandeja");
  await expect(page.getByRole("heading", { name: /^Bandeja · \d/ })).toBeVisible({ timeout: 15_000 });
  await page.locator("header").getByRole("button", { name: /Notificaciones/ }).click();
  await expect(page.getByText("Notificaciones", { exact: true }).last()).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const tema of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await comprobarContrasteNavegacion(page, 'header.sticky, nav[aria-label="Principal"]');
    await page.screenshot({ path: info.outputPath(`navegacion-${tema}.png`), fullPage: true });
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await comprobarContrasteNavegacion(page, '[role="dialog"]');
    await page.keyboard.press("Escape");
  }
});
