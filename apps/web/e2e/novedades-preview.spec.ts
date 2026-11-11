import { expect, type Page, test } from "@playwright/test";

import { abrirMenuUsuario } from "./menu-usuario";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-316: Novedades con indicador de no leídas, texto legible, «Marcar como leída» por novedad y
// «Marcar todas», la Bandeja resaltada con cualquier pendiente y, en los portales sin Bandeja, el punto
// rojo sobre el avatar (decisiones de Carlos del 11-nov). Corre en `preview-e2e` con el usuario de la
// empresa ficticia `qa-e2e` (nunca Gard). Las escrituras (marcar) solo las hace el proyecto de 1280 px:
// los tres tamaños comparten usuario y correrían en paralelo.

const RESUMEN = /^(\d+) novedad(?:es)? sin leer$|^Estás al día/;

async function pendientes(page: Page): Promise<number> {
  const texto = (await page.getByText(RESUMEN).first().textContent()) ?? "";
  return Number(/^(\d+)/.exec(texto)?.[1] ?? 0);
}

/** Novedades que la Bandeja dice tener sin leer (0 si no aparece su aviso). */
async function pendientesEnBandeja(page: Page): Promise<number> {
  const aviso = page.getByText(/^\d+ novedad(?:es)? de OPAI sin leer$/);
  if (!(await aviso.count())) return 0;
  return Number(/^(\d+)/.exec((await aviso.first().textContent()) ?? "")?.[1] ?? 0);
}

test.describe("@preview novedades y bandeja", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Novedades se lee sin asteriscos, se marca una o todas, y la Bandeja se resalta", async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/novedades");
    await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
    // El texto llega con formato: ninguna tarjeta muestra los asteriscos de la negrita.
    expect(await page.locator("main").first().innerText()).not.toContain("**");
    await capturar(page, info, "novedades-lista");

    await page.goto("/bandeja");
    // La Bandeja ya cargó cuando su título trae el número («Bandeja · N»).
    await expect(page.getByRole("heading", { name: /^Bandeja · \d+$/ })).toBeVisible({ timeout: 30_000 });
    await capturar(page, info, "novedades-bandeja");

    const filaNovedades = page.getByRole("menuitem", { name: /Novedades/ });
    await abrirMenuUsuario(page, filaNovedades);
    if ((await pendientesEnBandeja(page)) > 0)
      await expect(filaNovedades).toContainText(/\d+/, { timeout: 15_000 });
    await capturar(page, info, "novedades-menu-cuenta");
    await page.keyboard.press("Escape");

    // Portal sin Bandeja (supervisor), si el usuario lo tiene: el avatar avisa las novedades sin leer.
    await page.goto("/supervisor/novedades");
    if (new URL(page.url()).pathname.startsWith("/supervisor/novedades")) {
      const estado = page.getByText(RESUMEN).or(page.getByText("No pudimos cargar las novedades")).first();
      await expect(estado).toBeVisible({ timeout: 30_000 });
      const avatar = page.getByRole("button", { name: /^Menú de usuario/ }).filter({ visible: true }).first();
      if ((await page.getByText(RESUMEN).count()) > 0 && (await pendientes(page)) > 0)
        await expect(avatar).toHaveAccessibleName(/hay novedades sin leer/, { timeout: 15_000 });
      await capturar(page, info, "novedades-avatar-sin-bandeja");
    }

    if (info.project.name !== "desktop") {
      expect(errores).toEqual([]);
      return;
    }

    await page.goto("/bandeja");
    const titulo = page.getByRole("heading", { name: /^Bandeja · \d+$/ });
    await expect(titulo).toBeVisible({ timeout: 30_000 });
    // Con cualquier pendiente, el número de la Bandeja va en píldora roja en la barra lateral.
    if (Number(/(\d+)$/.exec((await titulo.textContent()) ?? "")?.[1] ?? 0) > 0)
      await expect(page.locator('nav a[href="/bandeja"] .bg-danger-fg').filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/novedades");
    await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
    const antes = await pendientes(page);
    if (antes > 0) {
      // Una sola: el botón de la tarjeta baja el número en uno.
      await page.getByRole("button", { name: "Marcar como leída" }).first().click();
      await expect
        .poll(() => pendientes(page), { timeout: 15_000 })
        .toBe(antes - 1);
    }
    if (antes > 1) {
      // Con pendientes, la Bandeja muestra el aviso y su número va resaltado en el menú.
      await page.goto("/bandeja");
      const aviso = page.getByText(/novedad(?:es)? de OPAI sin leer/);
      await expect(aviso).toBeVisible({ timeout: 30_000 });
      await capturar(page, info, "novedades-bandeja-pendientes");
      await page.getByRole("button", { name: "Marcar novedades como leídas" }).click();
      await expect(aviso).toHaveCount(0, { timeout: 15_000 });
    }

    await page.goto("/novedades");
    await expect(page.getByText(/^Estás al día/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Marcar como leída" })).toHaveCount(0);
    await capturar(page, info, "novedades-al-dia");
    expect(errores).toEqual([]);
  });
});
