import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, entrar } from "./sesion";
import { comprobarContrasteNavegacion } from "./contraste-navegacion";

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test("áreas, fijados, recientes, Más, preferencias y Bandeja", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (!E2E_PASSWORD) throw new Error("Falta contraseña E2E");
  await entrar(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bandeja · \d/ })).toBeVisible();
  const nav = page
    .getByRole("navigation", { name: "Principal", exact: true })
    .filter({ visible: true });
  if (info.project.name === "telefono") {
    await expect(nav.getByRole("link", { name: "Cuentas", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Personas", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "Más opciones" }).click();
    const mas = page.getByRole("dialog", { name: "Más", exact: true });
    await expect(mas.getByRole("button", { name: "Instalaciones", exact: true })).toBeVisible();
    await expect(mas.getByRole("button", { name: "Configuración", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
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
  await page.goto("/personas");
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((k) =>
    k.startsWith("opai_recientes_") && localStorage.getItem(k)?.includes('"/personas"'),
  ))).toBe(true);
  await page.keyboard.press("Control+k");
  const paleta = page.getByRole("dialog");
  await expect(paleta.getByText("Recientes", { exact: true })).toBeVisible();
  await expect(paleta.getByText("Acciones", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/configuracion/preferencias");
  await page.getByRole("radio", { name: /^Personas/ }).click();
  await expect(page.getByRole("radio", { name: /^Personas/ })).toHaveAttribute(
    "data-state",
    "checked",
  );
  if (info.project.name === "telefono")
    await expect(nav.getByRole("link", { name: "Cargos y sueldos", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: /^Según mi rol/ }).click();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bandeja · \d/ })).toBeVisible();
  await page
    .locator("header")
    .getByRole("link", { name: /Notificaciones/ })
    .click();
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
