import { expect, type Page, test } from "@playwright/test";
import { codigoTotp } from "./sesion";

const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const esperar = expect.configure({ timeout: 30_000 });

async function entrar(page: Page, ruta = "/login") {
  if (!password) throw new Error("Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  await page.goto(ruta);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
  if (new URL(page.url()).pathname === "/mfa") {
    await page.getByLabel(/Código/).fill(await codigoTotp());
    await page.getByRole("button", { name: "Verificar" }).click();
  }
  await page.waitForURL((u) => !["/login", "/mfa", "/elegir-empresa"].includes(u.pathname));
}

async function elegir(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Menú de usuario" }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: "Portal de inicio", exact: true }).click();
  const hoja = page.getByRole("dialog", { name: "Portal de inicio", exact: true });
  await esperar(hoja.getByLabel("Portal de inicio", { exact: true })).toBeEnabled();
  await hoja.getByLabel("Portal de inicio", { exact: true }).click();
  await page.getByRole("option", { name: nombre, exact: true }).click();
  await hoja.getByRole("button", { name: "Guardar", exact: true }).click();
  await esperar(hoja).not.toBeVisible();
}

test("elige con DS V2, persiste tras login y respeta next explícito", async ({ page }, info) => {
  test.setTimeout(180_000);
  await entrar(page, "/login?next=%2F");
  try {
    await elegir(page, "Supervisor");
    await page.context().clearCookies();
    await entrar(page);
    await esperar(page).toHaveURL(/\/supervisor$/);
    await page.getByRole("button", { name: "Menú de usuario" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "Portal de inicio", exact: true }).click();
    const hoja = page.getByRole("dialog", { name: "Portal de inicio" });
    await esperar(hoja.getByLabel("Portal de inicio", { exact: true })).toContainText("Supervisor");
    // La hoja enfoca inicialmente Cerrar mientras se cargan los datos; Tab llega al selector.
    for (let i = 0; i < 4; i++) {
      if (
        await hoja
          .getByLabel("Portal de inicio", { exact: true })
          .evaluate((e) => e === document.activeElement)
      )
        break;
      await page.keyboard.press("Tab");
    }
    await expect(hoja.getByLabel("Portal de inicio", { exact: true })).toBeFocused();
    await page.screenshot({
      path: `/tmp/opencode/d1-portal-inicio-${info.project.name}.png`,
      fullPage: true,
    });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await page.screenshot({ path: `/tmp/opencode/d1-portal-inicio-${info.project.name}-oscuro.png`, fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press("Escape");
    await page.context().clearCookies();
    await entrar(page, "/login?next=%2Fpersonas");
    await esperar(page).toHaveURL(/\/personas$/);
  } finally {
    await page.goto("/");
    await elegir(page, "Primero permitido");
  }
});
