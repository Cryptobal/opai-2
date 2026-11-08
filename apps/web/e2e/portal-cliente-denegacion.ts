import { expect, type Page } from "@playwright/test";

/** CAR-192: deniega a cuentas de empresa sin presentar el resumen ni datos del cliente. */
export async function esperarCuentaDeEmpresa(page: Page) {
  await expect(page.getByRole("status").getByText("Esta cuenta es de la empresa, no de un cliente", { exact: true })).toBeVisible();
  await expect(page.getByText("El Portal Cliente es para los contactos de tus clientes. Para entrar como cliente, cierra tu sesión y vuelve a entrar con el correo con el que te invitaron.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar sesión para entrar como cliente", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver al ERP", exact: true })).toHaveAttribute("href", "/");
  await expect(page.getByRole("navigation", { name: "Mes del informe", exact: true })).toHaveCount(0);
  await expect(page.getByText("Este resumen es tu informe mensual: la descarga traerá el mismo contenido.", { exact: true })).toHaveCount(0);
}
