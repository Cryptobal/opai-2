import { expect, test } from "@playwright/test";

import { canjear, pedirAutorizacion, permitir } from "./oauth-apoyo";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-247: con dos empresas, la persona elige con cuál entra la app y el consentimiento queda atado a
// esa; la próxima app vuelve a preguntar (la elección no se arrastra). Usuario de `seed:multiempresa-e2e`
// (Gard y Atlas, ficticio), solo en local y en el e2e de CI.
const email = process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl";

test.describe("OAuth del MCP con varias empresas", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("elige la empresa de la app y la pide de nuevo para la siguiente", async ({
    page,
    request,
  }, info) => {
    await entrar(page, email);
    const primera = await pedirAutorizacion(request);
    await page.goto(primera.url);
    await page.waitForURL((u) => u.pathname === "/autorizar/empresa");
    await expect(page.getByText("Elige con qué empresa entrará la app")).toBeVisible();
    await capturar(page, info, "oauth-empresa");
    await page.getByRole("button", { name: /Atlas/ }).click();
    await page.waitForURL((u) => u.pathname === "/autorizar");
    await expect(page.getByText("Atlas Seguridad SpA")).toBeVisible();
    const codigo = await permitir(page);
    expect((await canjear(request, primera, codigo)).status()).toBe(200);

    const segunda = await pedirAutorizacion(request);
    await page.goto(segunda.url);
    await page.waitForURL((u) => u.pathname === "/autorizar/empresa");
  });
});
