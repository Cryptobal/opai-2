import { expect, test } from "@playwright/test";

import { contenidoHidratado, hidratado } from "./hidratacion";
import { BARRA, captura, erroresDeConsola, marco } from "./hilo-apoyo";
import { ocultarIndicadorDev } from "./indicador-dev";
import { E2E_PASSWORD as password, entrar } from "./sesion";

test.beforeEach(async ({ page }) => ocultarIndicadorDev(page));

// Corre también en `preview-e2e` (A2.10), con el usuario de la empresa ficticia `qa-e2e`: no depende
// de datos sembrados, solo de las pantallas del ERP.
test.describe("@preview marco Hilo con sesión", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("se elige en Preferencias, navega dentro del lienzo y se vuelve al clásico", async ({
    page,
  }, info) => {
    test.setTimeout(240_000);
    await entrar(page);
    await page.goto("/");
    await expect(marco(page)).toHaveCount(0);

    await page.goto("/mi-cuenta/preferencias");
    const hilo = page.getByRole("radio", { name: /^Hilo/ });
    await hidratado(hilo);
    await hilo.click();
    await expect(marco(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("radio", { name: /^Hilo/ })).toBeChecked();
    // Sin parpadeo: con la cookie, el servidor ya manda el marco Hilo en el HTML del documento.
    const documento = await page.goto("/mi-cuenta/preferencias");
    expect(await documento?.text()).toContain('data-marco="hilo"');
    await expect(page.getByRole("radio", { name: /^Hilo/ })).toBeChecked();
    await expect(page.getByRole("heading", { level: 1, name: "Preferencias" })).toBeVisible();
    await contenidoHidratado(page);
    await captura(page, "hilo-erp-preferencias", info);

    const errores = erroresDeConsola(page);
    await page.goto("/");
    await expect(marco(page)).toHaveAttribute("data-vista", "inicio");
    // Los pendientes se piden después de pintar: se espera a que el hilo deje de cargar.
    await expect(
      page.getByRole("complementary", { name: "Hilo" }).locator('[aria-busy="true"]'),
    ).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(page.getByText("Revisando tus pendientes.")).toHaveCount(0);
    // Cargó de verdad: no quedó en el estado de error con «Reintentar».
    await expect(
      page.getByRole("complementary", { name: "Hilo" }).getByRole("button", { name: "Reintentar" }),
    ).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Pendientes/ })).toBeVisible();
    // El saludo y lo que requiere decisión viven en el hilo: la página de Inicio no los repite.
    await expect(page.getByText("Requiere tu decisión hoy")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /^(Buen día|Buenas tardes|Buenas noches), / }),
    ).toHaveCount(1);
    // El saludo del Inicio clásico («Hola», «Buenos días»…) no se pinta dentro del lienzo, ni oculto.
    await expect(
      page.locator("main").getByText(/^(Hola|Buenos días|Buenas tardes|Buenas noches), /),
    ).toHaveCount(0);
    await contenidoHidratado(page);
    await captura(page, "hilo-erp-inicio", info);

    const indice = page.getByRole("button", { name: "Índice de todo el portal" });
    await hidratado(indice);
    await indice.click();
    await captura(page, "hilo-erp-indice", info);
    await page
      .getByRole("navigation", { name: "Índice" })
      .getByRole("link", { name: "Cuentas" })
      .click();
    await expect(page).toHaveURL(/\/cuentas/);
    await expect(marco(page)).toHaveAttribute("data-vista", "pantalla");
    await expect(page.getByRole("navigation", { name: "Índice" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Cuentas" })).toBeVisible();
    await contenidoHidratado(page);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await captura(page, "hilo-erp-cuentas", info);

    await page.getByRole("button", { name: BARRA }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto("/pauta");
    await expect(marco(page)).toHaveAttribute("data-vista", "ancha");
    await contenidoHidratado(page);
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await captura(page, "hilo-erp-pauta", info);
    expect(errores).toEqual([]);

    await page.goto("/");
    await contenidoHidratado(page);
    const portales = page.getByRole("button", { name: "Portales", exact: true });
    await hidratado(portales);
    await portales.click();
    await captura(page, "hilo-erp-portales", info);
    await page.getByRole("button", { name: "Volver al diseño clásico" }).click();
    // Vuelta al clásico, probada en positivo: aparece su navegación y el servidor ya no manda el Hilo.
    await expect(page.getByRole("navigation", { name: "Principal" }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(marco(page)).toHaveCount(0);
    const clasico = await page.goto("/");
    expect(await clasico?.text()).not.toContain('data-marco="hilo"');
    await expect(page.locator("html")).not.toHaveAttribute("data-marco", "hilo");
  });
});
