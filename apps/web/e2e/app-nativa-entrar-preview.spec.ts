import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Brief 17 (CAR-90): las apps nativas abren `/entrar` con el user agent de Android más «OPAIApp/opai».
const AGENTE_APP =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 OPAIApp/opai";
const PORTALES = ["/", "/supervisor", "/trabajador", "/terreno", "/cliente", "/platform"];

test.describe("@preview app nativa: /entrar lleva a cada perfil a su portal", () => {
  test.use({ userAgent: AGENTE_APP });

  test("con sesión, la app cae en el portal de la persona (o en el selector)", async ({
    page,
  }, info) => {
    test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
    await entrar(page);
    await page.goto("/entrar");
    await page.waitForLoadState("domcontentloaded");
    const ruta = new URL(page.url()).pathname;
    if (ruta === "/entrar") {
      await expect(page.getByRole("heading", { name: "Entrar a OPAI" })).toBeVisible();
    } else {
      expect(PORTALES).toContain(ruta);
    }
    await capturar(page, info, "app-nativa-entrar");
  });

  test("sin sesión y con un equipo desconocido, va al ingreso y vuelve a /entrar", async ({
    page,
    context,
    baseURL,
  }) => {
    await pasarProteccionDeVercel(page);
    await context.addCookies([
      {
        name: "opai_dispositivo",
        value: "token-que-no-existe",
        url: baseURL ?? "http://localhost:3000",
      },
    ]);
    await page.goto("/entrar");
    await page.waitForURL((u) => u.pathname === "/login");
    expect(new URL(page.url()).searchParams.get("next")).toBe("/entrar");
  });
});
