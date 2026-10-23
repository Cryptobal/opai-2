import { expect, type Page, test } from "@playwright/test";

// Configuración (Brief 02, sesión C, bloque 12): Empresa, Marca, Preferencias, Documentos y
// Módulos a 375, 1024 y 1280, con capturas en e2e/__screenshots__/.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

const SECCIONES = [
  ["empresa", "Datos de la empresa"],
  ["marca", "Marca"],
  ["preferencias", "Preferencias"],
  ["documentos", "Documentos"],
  ["modulos", "Módulos"],
] as const;

test.describe("configuración: empresa y plataforma del tenant", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("cada sección carga con su título", async ({ page }, info) => {
    await entrar(page);
    for (const [ruta, titulo] of SECCIONES) {
      await page.goto(`/configuracion/${ruta}`);
      await expect(page.getByRole("heading", { name: titulo, exact: true }).first()).toBeVisible();
      await expect(page.getByText("Algo salió mal")).toHaveCount(0);
      await page.screenshot({
        path: `e2e/__screenshots__/configuracion-${ruta}-${info.project.name}.png`,
        fullPage: true,
      });
    }
  });

  test("preferencias: el tema se guarda y se aplica", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    await entrar(page);
    await page.goto("/configuracion/preferencias");
    const guardado = () =>
      page.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().includes("/configuracion/preferencias"),
      );
    let respuesta = guardado();
    await page.getByRole("radio", { name: "Oscuro" }).click();
    await respuesta;
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    // Se guarda en core.config (ámbito usuario): al recargar sigue elegido.
    await expect(async () => {
      await page.reload();
      await expect(page.getByRole("radio", { name: "Oscuro" })).toBeChecked({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    respuesta = guardado();
    await page.getByRole("radio", { name: /Sistema/ }).click();
    await respuesta;
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    await expect(async () => {
      await page.reload();
      await expect(page.getByRole("radio", { name: /Sistema/ })).toBeChecked({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  });

  test("documentos: la hoja de nuevo tipo valida el código", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "Una vez (iPad)");
    await entrar(page);
    await page.goto("/configuracion/documentos?capa=persona&nuevo=1");
    const hoja = page.getByRole("dialog", { name: "Nuevo tipo de documento" });
    await expect(hoja).toBeVisible();
    await hoja.getByLabel("Código").fill("Con Espacios");
    await hoja.getByLabel("Nombre").fill("Licencia de conducir");
    await expect(hoja.getByRole("button", { name: "Crear tipo" })).toBeDisabled();
  });
});
