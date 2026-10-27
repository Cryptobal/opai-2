import { expect, test } from "@playwright/test";
import { entrar } from "./sesion";

test("preferencias de navegación: una carga fallida permite reintentar sin escribir", async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await entrar(page);
  let fallar = true;
  let escrituras = 0;
  await page.route("**/*", async (ruta) => {
    const peticion = ruta.request();
    const cuerpo = peticion.postData() ?? "";
    if (peticion.method() === "POST" && cuerpo.includes("core.config.set")) escrituras++;
    if (fallar && new URL(peticion.url()).pathname === "/configuracion/preferencias" && peticion.method() === "POST" && cuerpo.includes("core.config.get")) {
      await ruta.abort("failed");
      return;
    }
    await ruta.continue();
  });
  await page.goto("/configuracion/preferencias");
  const error = page.getByRole("region", { name: "Preferencias", exact: true }).getByRole("alert");
  await expect(error).toContainText("No se pudieron cargar tus preferencias");
  await expect(page.getByRole("radio", { name: /^Personas/ })).toBeDisabled();
  expect(escrituras).toBe(0);
  fallar = false;
  await page.getByRole("region", { name: "Preferencias" }).getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Personas/ })).toBeEnabled();
  await expect(error).toHaveCount(0);
  expect(escrituras).toBe(0);
  expect(errores).toEqual([]);
});

test("el shell informa cuando no puede cargar los fijados", async ({ page }, info) => {
  await entrar(page);
  await page.route("**/*", async (ruta) => {
    const peticion = ruta.request();
    if (peticion.method() === "POST" && (peticion.postData() ?? "").includes("core.config.get")) {
      await ruta.abort("failed");
    } else await ruta.continue();
  });
  await page.reload();
  const nav = page.getByRole("navigation", { name: "Principal", exact: true }).filter({ visible: true });
  if (info.project.name === "telefono") {
    await nav.getByRole("button", { name: "Más opciones" }).click();
    const mas = page.getByRole("dialog", { name: "Más" });
    await expect(mas.getByRole("alert")).toContainText("No pudimos cargar tus fijados");
    await expect(mas.getByText("Fija hasta cinco entradas o fichas")).toHaveCount(0);
    const reintentar = mas.getByRole("button", { name: "Reintentar" });
    const caja = await reintentar.boundingBox();
    expect(caja?.height).toBeGreaterThanOrEqual(44);
    expect(caja?.width).toBeGreaterThanOrEqual(44);
    await reintentar.focus();
    await expect(reintentar).toBeFocused();
    await page.keyboard.press("Enter");
  } else {
    await expect(nav.getByRole("alert")).toContainText("No pudimos cargar tus fijados");
    await expect(nav.getByText("Fija hasta cinco entradas o fichas")).toHaveCount(0);
  }
});
