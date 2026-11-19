import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

// CAR-597 · listas con búsqueda, «Todas» y paginación (@preview)
const GERENTE = "r3-gerente@opai.cl";

test.describe("@preview", () => {
  // TODO(CAR-664): reactivar tras provisionar los roles correctos en qa-e2e y validar la búsqueda.
  // Fallback autorizado por Carlos después de 30 min; no sustituye la reparación preparada.
  test.fixme("gerente: ve Todas las rendiciones y busca por código", async ({ page }, info) => {
    await entrar(page, GERENTE);
    await page.goto("/rendiciones/todas");
    await expect(page.getByRole("heading", { name: "Todas las rendiciones" })).toBeVisible();
    await expect(page.getByPlaceholder(/Buscar/).first()).toBeVisible();
  await info.attach("todas-1280", { body: await page.screenshot(), contentType: "image/png" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/rendiciones/todas");
    await expect(page.getByRole("heading", { name: "Todas las rendiciones" })).toBeVisible();
    await info.attach("todas-375", { body: await page.screenshot(), contentType: "image/png" });
  });

  // TODO(CAR-664): reactivar tras provisionar los roles correctos en qa-e2e y validar la búsqueda.
  // Fallback autorizado por Carlos después de 30 min; no sustituye la reparación preparada.
  test.fixme("supervisor: Mis rendiciones con pestañas y búsqueda", async ({ page }, info) => {
    await entrar(page, "r3-aprobador@opai.cl");
    await page.goto("/rendiciones");
    await expect(page.getByRole("heading", { name: "Mis rendiciones" })).toBeVisible();
    await expect(page.getByPlaceholder(/Buscar/).first()).toBeVisible();
    await info.attach("mias-1280", { body: await page.screenshot(), contentType: "image/png" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/rendiciones/enviadas");
    await expect(page.getByRole("tab", { name: /Enviadas/ })).toBeVisible();
    await info.attach("mias-375", { body: await page.screenshot(), contentType: "image/png" });
  });
});