import { expect, test } from "@playwright/test";

import { capturar, pasarProteccionDeVercel } from "./preview";

// CAR-515 y CAR-516: Google bloquea su ingreso en las vistas web de las apps; dentro de la app el botón
// abre el navegador del sistema (plugin de Capacitor) y nunca navega a Google desde la vista web.
const AGENTE_APP =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 OPAIApp/opai";

test.describe("@preview app nativa: ingreso con Google por el navegador del sistema", () => {
  test.use({ userAgent: AGENTE_APP });

  test("dentro de la app, Google no navega desde la vista web", async ({ page }, info) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/login");
    await expect(page.getByLabel("Correo")).toBeVisible();
    await capturar(page, info, "app-nativa-login");
    const google = page.getByRole("button", { name: "Continuar con Google" });
    if ((await google.count()) === 0) return; // Google sin configurar en esta vista previa.
    // Sin el plugin del navegador del sistema (Playwright no es la app), el botón no hace nada.
    await google.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("un canje sin verificador avisa y ofrece volver al ingreso", async ({ page }, info) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/app/canje?codigo=codigo-que-no-existe");
    await expect(page.getByText("No pudimos completar el ingreso")).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al ingreso" })).toBeVisible();
    await capturar(page, info, "app-nativa-canje-error");
  });
});

const AGENTE_IOS_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Mobile/15E148 OPAIApp/opai";

test.describe("@preview iOS: cambio de PIN a correo en el mismo origen", () => {
  test.use({ userAgent: AGENTE_IOS_APP });

  test("el enlace carga un documento completo sin salir de OPAI", async ({ page }) => {
    await pasarProteccionDeVercel(page);
    await page.goto("/trabajador/login");
    const origen = new URL(page.url()).origin;
    const correo = page.getByRole("link", { name: "Entrar con correo y contraseña" });
    await expect(correo).toHaveAttribute("href", "/login");
    const documento = page.waitForRequest(
      (r) =>
        r.isNavigationRequest() && r.resourceType() === "document" && r.url() === `${origen}/login`,
    );
    await correo.click();
    await documento;
    await expect(page).toHaveURL(`${origen}/login`);
    await expect(page.getByLabel("Correo")).toBeVisible();
  });

  test("fallos opcionales del puente y de passkeys no bloquean el formulario", async ({ page }) => {
    const errores: string[] = [];
    page.on("pageerror", (error) => errores.push(error.message));
    await pasarProteccionDeVercel(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, "Capacitor", {
        value: {
          Plugins: {
            App: {
              getLaunchUrl: () => {
                throw new Error("App no disponible");
              },
              addListener: () => Promise.reject(new Error("Suscripción rechazada")),
            },
            Browser: { open: () => Promise.reject(new Error("Browser no disponible")) },
          },
        },
      });
      if (window.PublicKeyCredential) {
        Object.defineProperty(window.PublicKeyCredential, "isConditionalMediationAvailable", {
          value: () => Promise.reject(new Error("Mediación condicional no disponible")),
        });
      }
    });
    await page.goto("/login");
    await page.getByLabel("Correo").fill("sintetico@example.test");
    await page.getByLabel("Contraseña", { exact: true }).fill("solo-fixture");
    const google = page.getByRole("button", { name: "Continuar con Google" });
    if (await google.count()) {
      await google.click();
      await expect(page.getByText("No pudimos abrir Google")).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
    expect(errores).toEqual([]);
  });
});
