import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test("áreas, fijados, recientes, Más, preferencias y Bandeja", async ({ page }, info) => {
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta contraseña E2E");
  await page.goto("/login");
  await page.getByLabel("Correo").fill(process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Bandeja/ })).toBeVisible();
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
    await pin.click();
    await expect(pin).toHaveAttribute("aria-label", "Desfijar");
    await page.reload();
    await expect(nav.getByText("Fijados", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Cuentas", exact: true }).first()).toBeVisible();
  }
  await page.goto("/personas");
  await page.waitForTimeout(600); // Registro deliberadamente diferido del reciente (400 ms).
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
  await page
    .locator("header")
    .getByRole("link", { name: /Notificaciones/ })
    .click();
  await expect(page).toHaveURL(/#bandeja$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const tema of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await page.screenshot({ path: info.outputPath(`navegacion-${tema}.png`), fullPage: true });
  }
});
