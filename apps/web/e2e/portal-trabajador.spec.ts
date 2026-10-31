import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

// Portal Trabajador PR 1 (Brief 15). El owner de e2e no tiene una persona vinculada, así que prueba
// los estados «sin ficha»; el comportamiento con ficha (alcance, edición, preferencias) lo prueba
// `portal-trabajador-db.test.ts` contra Postgres real. Corre con 1 worker.
test.setTimeout(180_000);

const PANTALLAS = [
  { ruta: "/trabajador/mis-datos", titulo: "Mis datos" },
  { ruta: "/trabajador/notificaciones", titulo: "Notificaciones" },
  { ruta: "/trabajador/privacidad", titulo: "Privacidad" },
];

test("Más lista solo lo que existe y cada entrada abre su pantalla", async ({ page }) => {
  await entrar(page);
  await page.goto("/trabajador/mas");
  for (const { ruta } of PANTALLAS)
    await expect(page.locator(`a[href="${ruta}"]`).first()).toBeVisible();
  // Lo pendiente (Central, rondas, accesos, pauta) no se dibuja como entrada falsa.
  for (const pendiente of ["Central", "Rondas", "Accesos", "Mi pauta"])
    await expect(page.getByRole("link", { name: pendiente })).toHaveCount(0);
});

for (const { ruta, titulo } of PANTALLAS) {
  test(`${titulo}: sin ficha vinculada muestra el estado vacío con orientación, sin errores`, async ({ page }) => {
    await entrar(page);
    await page.goto(ruta);
    await expect(page).toHaveTitle(new RegExp(`${titulo} · Portal Trabajador`));
    // Con ficha (dev local) aparece el formulario; sin ella, el estado vacío. Nunca un error genérico.
    const vacio = page.getByText("Tu cuenta aún no tiene una ficha");
    const conFicha = page.getByRole("button", { name: "Guardar cambios" });
    const privacidad = page.getByText("Quién cuida tus datos");
    await expect(vacio.or(conFicha).or(privacidad).first()).toBeVisible();
    await expect(page.getByText("No pudimos cargar esta información")).toHaveCount(0);
    await expect(page.locator("main, [data-contenido]").first()).not.toContainText("undefined");
    // Sin scroll horizontal en teléfono (375): el contenido cabe en el ancho.
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ancho).toBeLessThanOrEqual(0);
  });
}

test("Inicio saluda sin errores y navega a Mis datos desde la barra", async ({ page }) => {
  await entrar(page);
  await page.goto("/trabajador");
  await expect(page).toHaveTitle(/Inicio · Portal Trabajador/);
  await expect(page.getByText("No pudimos cargar esta información")).toHaveCount(0);
  await page.locator('a[href="/trabajador/mis-datos"]').first().click();
  await page.waitForURL((u) => u.pathname === "/trabajador/mis-datos");
});
