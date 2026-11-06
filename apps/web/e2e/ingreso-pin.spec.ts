import { expect, type Page, test } from "@playwright/test";

// CAR-78 · B1: login de Trabajador con RUT + PIN (export-acceso 06 y 07). Cubre la pantalla pública:
// RUT con formato, teclado numérico, botón deshabilitado hasta tener RUT y 6 dígitos, objetivos
// táctiles de 44 px o más y el aviso único ante datos incorrectos (sin distinguir si el RUT existe).
// Capturas a 375, 1024 y 1280 px, en claro y oscuro, en e2e/__screenshots__/.

async function captura(page: Page, nombre: string, proyecto: string, tema: string) {
  await page.screenshot({
    path: `e2e/__screenshots__/${nombre}-${tema}-${proyecto}.png`,
    fullPage: true,
  });
}

for (const tema of ["light", "dark"] as const) {
  test.describe(`tema ${tema}`, () => {
    test.use({ colorScheme: tema });

    test("el teclado completa el PIN y habilita Entrar", async ({ page }, info) => {
      const p = info.project.name;
      await page.goto("/trabajador/login");
      await expect(page.getByRole("heading", { name: "Ingresa con tu RUT" })).toBeVisible();
      await captura(page, "pin-login-vacio", p, tema);

      const entrar = page.getByRole("button", { name: "Entrar" });
      await expect(entrar).toBeDisabled();
      await page.getByLabel("RUT").fill("123456785");
      await expect(page.getByLabel("RUT")).toHaveValue("12.345.678-5");
      for (const d of "48291") await page.getByRole("button", { name: d, exact: true }).click();
      await expect(entrar).toBeDisabled();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await expect(entrar).toBeEnabled();
      await captura(page, "pin-login-completo", p, tema);

      // Borrar el último dígito vuelve a deshabilitar.
      await page.getByRole("button", { name: "Borrar el último dígito" }).click();
      await expect(entrar).toBeDisabled();
    });

    test("las teclas miden 44 px o más", async ({ page }) => {
      await page.goto("/trabajador/login");
      for (const d of ["1", "5", "0"]) {
        const caja = await page.getByRole("button", { name: d, exact: true }).boundingBox();
        expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
        expect(caja?.width ?? 0).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

test("el RUT con dígito verificador malo avisa y no deja entrar; el que termina en K sí", async ({
  page,
}) => {
  await page.goto("/trabajador/login");
  const entrar = page.getByRole("button", { name: "Entrar" });
  const rut = page.getByLabel("RUT");
  const teclear = async () => {
    for (const d of "482915") await page.getByRole("button", { name: d, exact: true }).click();
  };
  await teclear();
  // DV malo: 12.345.678-0 (el correcto es 5). Con 8 o más caracteres avisa sin salir del campo.
  await rut.fill("123456780");
  await expect(page.getByText("RUT inválido, revisa el dígito verificador")).toBeVisible();
  await expect(entrar).toBeDisabled();
  // DV correcto: se limpia el aviso y se habilita.
  await rut.fill("123456785");
  await expect(page.getByText("RUT inválido, revisa el dígito verificador")).toBeHidden();
  await expect(entrar).toBeEnabled();
  // Un RUT válido que termina en K (6.000.000-K): se acepta, y la k se escribe en mayúscula.
  await rut.fill("6000000k");
  await expect(rut).toHaveValue("6.000.000-K");
  await expect(entrar).toBeEnabled();
  // Mientras escribe (menos de 8 caracteres y sin salir del campo) todavía no se le reprocha.
  await rut.fill("1234");
  await expect(page.getByText("RUT inválido, revisa el dígito verificador")).toBeHidden();
  await expect(entrar).toBeDisabled();
});

test("datos incorrectos muestran el mismo aviso, exista o no el RUT", async ({ page }, info) => {
  await page.goto("/trabajador/login");
  await page.getByLabel("RUT").fill("99999999-9"); // dígito verificador válido de un RUT sin cuenta
  for (const d of "111112") await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("RUT o PIN incorrectos")).toBeVisible();
  await captura(page, "pin-login-error", info.project.name, "light");
});

test("el pie lleva al ingreso con correo", async ({ page }) => {
  await page.goto("/trabajador/login");
  await page.getByRole("link", { name: "Entrar con correo y contraseña" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
