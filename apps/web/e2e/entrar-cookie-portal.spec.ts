import { expect, type Page, test } from "@playwright/test";

/**
 * D1 del Brief 04: `/entrar` (el `start_url` de la PWA) recuerda el portal elegido en una cookie del
 * dispositivo y la lee EN EL SERVIDOR para redirigir sin pintar el selector. La cookie (`opai_portal`)
 * vive en un módulo sin "use client" (`cookie-portal.ts`); si estuviera en el módulo cliente, el
 * servidor recibiría una referencia de cliente en vez de la cadena y la preferencia nunca se aplicaría.
 * Esta prueba falla justo en ese caso: sin leer la cookie, `/entrar` mostraría el selector.
 */

const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  // Con más de una empresa el acceso pide elegir (se parte de Gard); con una, pasa de largo.
  const gard = page.getByRole("button", { name: /Gard Security/ });
  await Promise.race([
    gard.waitFor({ state: "visible" }),
    page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform"),
  ]).catch(() => undefined);
  if (await gard.isVisible().catch(() => false)) await gard.click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform");
}

test.describe("D1: /entrar lee la cookie del portal en el servidor", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("con la cookie del portal, /entrar redirige sin pintar el selector", async ({
    page,
    context,
  }) => {
    await entrar(page, email);

    // Sin la cookie, el usuario de plataforma (ERP + Plataforma) ve el selector: no hay auto-destino.
    await context.clearCookies({ name: "opai_portal" });
    await page.goto("/entrar");
    await expect(page.getByRole("heading", { name: "Entrar a OPAI" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Plataforma" })).toBeVisible();
    await expect(page).toHaveURL(/\/entrar$/);

    // Con la cookie puesta en «platform», el servidor la lee y redirige a /platform sin selector.
    await context.addCookies([
      { name: "opai_portal", value: "platform", url: page.url() },
    ]);
    await page.goto("/entrar");
    await page.waitForURL((u) => u.pathname === "/platform");
    await expect(page.getByRole("heading", { name: "Entrar a OPAI" })).toHaveCount(0);
  });
});
