import { expect, type Page, test, type TestInfo } from "@playwright/test";

async function capturar(page: Page, info: TestInfo, nombre: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const tema of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
    await page.screenshot({ path: info.outputPath(`${nombre}-${tema}.png`), fullPage: true });
  }
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
}

test("Inspector con base supervisor: menú efectivo y dirección de Empresa de solo lectura", async ({
  page,
}, info) => {
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta contraseña E2E");
  await page.goto("/login");
  await page.getByLabel("Correo").fill("inspector-seguimiento@opai.cl");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  if (info.project.name === "desktop") {
    await expect(
      page.getByRole("link", { name: "Cargos y sueldos", exact: true }).first(),
    ).toBeVisible();
  }
  await page.goto("/cargos");
  await expect(
    page.getByRole("heading", { name: "Cargos y sueldos", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Nuevo", exact: true })).toHaveCount(0);
  await capturar(page, info, "cargos");
  const cargo = await page.locator('a[href^="/cargos/"]').first().getAttribute("href");
  if (!cargo) throw new Error("La base E2E necesita un cargo");
  for (const query of ["", "?editar=1", "?version=1"]) {
    await page.goto(`${cargo}${query}`);
    await expect(page.getByRole("switch", { name: "Sueldo sensible" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Crear versión", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Acciones del cargo" })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await capturar(page, info, "cargo-lectura");
  await page.goto("/configuracion/empresa");
  await expect(page.locator("#e-razon")).toBeDisabled();
  await expect(page.locator("#e-dir")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Escribir a mano" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0);
  await page.locator("#e-dir").evaluate((e) => (e as HTMLElement).focus());
  await expect(page.locator("#e-dir")).not.toBeFocused();
  await capturar(page, info, "empresa-lectura");
});
