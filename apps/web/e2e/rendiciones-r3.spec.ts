import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

// CAR-208 · Rendiciones R3: bandeja del aprobador y lotes de pago. Solo empresas de QA con personas ficticias
// (fixture `seed:rendiciones-r3-e2e`: qa-rendiciones-r3 y qa-rendiciones-r3-b). Los tres viewports corren en
// paralelo sobre la misma base: lo que muta (devolver) usa REN-910001 solo en «desktop»; el resto solo lee.
const EMAIL = {
  aprobador: "r3-aprobador@opai.cl",
  gerente: "r3-gerente@opai.cl",
  viewer: "r3-viewer@opai.cl",
  sinAprobador: "r3-sin-aprobador@opai.cl",
} as const;

test("aprobador: ve su bandeja con totales y abre una rendición para revisar", async ({ page }, info) => {
  await entrar(page, EMAIL.aprobador);
  await page.goto("/rendiciones/bandeja");
  await expect(page.getByText("Por revisar").first()).toBeVisible();
  await expect(page.getByText("Monto por revisar")).toBeVisible();
  await expect(page.getByText("Aprobadas sin pagar")).toBeVisible();
  await expect(page.getByText(/REN-910002/).first()).toBeVisible();
  await info.attach("bandeja", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByText(/REN-910002/).first().click();
  await expect(page.getByRole("button", { name: "Aprobar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Devolver" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rechazar" })).toBeVisible();
  await expect(page.getByText("Ferretería ficticia")).toBeVisible();
  await info.attach("detalle", { body: await page.screenshot(), contentType: "image/png" });
});

test("aprobador: devolver exige motivo y saca la rendición de la bandeja", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Muta datos compartidos: una sola vez, en desktop.");
  await entrar(page, EMAIL.aprobador);
  await page.goto("/rendiciones/bandeja");
  await page.getByText(/REN-910001/).first().click();
  await page.getByRole("button", { name: "Devolver" }).click();
  await expect(page.getByText(/Escribe el motivo/)).toBeVisible();
  await page.getByLabel(/Motivo/).fill("Falta el folio de la boleta");
  await page.getByRole("button", { name: "Devolver" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Devolver" }).click();
  await expect(page).toHaveURL(/\/rendiciones\/bandeja(\?|$)/);
  await expect(page.getByRole("link", { name: /REN-910001/ })).toHaveCount(0);
  await info.attach("tras-devolver", { body: await page.screenshot(), contentType: "image/png" });
});

test("aprobador: no ve ni arma lotes de pago", async ({ page }) => {
  await entrar(page, EMAIL.aprobador);
  await page.goto("/rendiciones/lotes");
  await expect(page.getByText("Aprobadas listas para pagar")).toHaveCount(0);
  await expect(page.getByText(/permiso|acceso/i).first()).toBeVisible();
});

test("viewer: sin permiso en la bandeja", async ({ page }, info) => {
  await entrar(page, EMAIL.viewer);
  await page.goto("/rendiciones/bandeja");
  await expect(page.getByText(/permiso|acceso/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
  await info.attach("sin-permiso", { body: await page.screenshot(), contentType: "image/png" });
});

test("gerente: lotes de pago con la aprobada sin datos bancarios y sin lotes aún", async ({ page }, info) => {
  await entrar(page, EMAIL.gerente);
  await page.goto("/rendiciones/lotes");
  await expect(page.getByText("Aprobadas listas para pagar")).toBeVisible();
  await expect(page.getByText(/REN-910003/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Sin datos bancarios en la ficha").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear lote" })).toBeDisabled();
  await info.attach("lotes", { body: await page.screenshot(), contentType: "image/png" });
});

test("empresa sin aprobador: bandeja vacía y sin ver la rendición de otra empresa", async ({ page }, info) => {
  await entrar(page, EMAIL.sinAprobador);
  await page.goto("/rendiciones/bandeja");
  await expect(page.getByText("No tienes rendiciones por revisar")).toBeVisible();
  await expect(page.getByText(/REN-91000/)).toHaveCount(0);
  await info.attach("empresa-b", { body: await page.screenshot(), contentType: "image/png" });
});
