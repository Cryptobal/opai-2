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
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Personas/ })).toBeEnabled();
  await expect(error).toHaveCount(0);
  expect(escrituras).toBe(0);
  expect(errores).toEqual([]);
});
