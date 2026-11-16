import { expect, type Page, test } from "@playwright/test";

import { abrirMenuUsuario } from "./menu-usuario";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-316 y CAR-430: Novedades agrupadas por fecha (Hoy / Esta semana / Antes), tarjetas cortas con
// «Probarlo» y «Ver más», «Marcar como leída» por novedad y «Marcar todas». La Bandeja ya no repite las
// novedades; su aviso va en el avatar y en el botón «Yo», también en el ERP. Corre en `preview-e2e` con el usuario de la
// empresa ficticia `qa-e2e` (nunca Gard). Las escrituras (marcar) solo las hace el proyecto de 1280 px:
// los tres tamaños comparten usuario y correrían en paralelo.

const RESUMEN = /^(\d+) novedad(?:es)? sin leer$|^Estás al día/;

async function pendientes(page: Page): Promise<number> {
  const texto = (await page.getByText(RESUMEN).first().textContent()) ?? "";
  return Number(/^(\d+)/.exec(texto)?.[1] ?? 0);
}

test.describe("@preview novedades y bandeja", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("Novedades agrupadas y cortas, se marcan una o todas, y la Bandeja no las repite", async ({
    page,
  }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.name));
    await entrar(page);

    await page.goto("/novedades");
    await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
    // El texto llega con formato: ninguna tarjeta muestra los asteriscos de la negrita.
    expect(await page.locator("main").first().innerText()).not.toContain("**");
    // CAR-430: agrupadas por fecha y sin la etiqueta interna «Núcleo».
    await expect(
      page.getByRole("heading", { name: /^(Hoy|Esta semana|Antes)$/ }).first(),
    ).toBeVisible();
    await expect(page.locator("main").getByText("Núcleo", { exact: true })).toHaveCount(0);
    const verMas = page.getByRole("button", { name: "Ver más" }).first();
    if (await verMas.count()) {
      await verMas.click();
      await expect(page.getByRole("button", { name: "Ver menos" }).first()).toBeVisible();
    }
    await capturar(page, info, "novedades-lista");

    // CAR-245: filtro «Todas / No leídas». En «No leídas» no queda ninguna tarjeta leída; sin
    // pendientes, aparece el vacío con «Ver todas», que vuelve a la lista completa.
    const filtro = page.getByRole("group", { name: "Filtrar novedades" });
    await filtro.getByRole("button", { name: /^No leídas/ }).click();
    if ((await pendientes(page)) === 0) {
      await expect(page.getByText("No tienes novedades sin leer")).toBeVisible();
      await capturar(page, info, "novedades-filtro-no-leidas");
      await page.getByRole("button", { name: "Ver todas" }).click();
    } else {
      await expect(page.getByRole("button", { name: "Marcar como leída" }).first()).toBeVisible();
      await capturar(page, info, "novedades-filtro-no-leidas");
      await filtro.getByRole("button", { name: "Todas" }).click();
    }
    await expect(page.getByText(RESUMEN).first()).toBeVisible();

    await page.goto("/bandeja");
    // La Bandeja ya cargó cuando su título trae el número («Bandeja · N»).
    await expect(page.getByRole("heading", { name: /^Bandeja · \d+$/ })).toBeVisible({
      timeout: 30_000,
    });
    // CAR-430: la Bandeja ya no repite «N novedades de OPAI sin leer».
    await expect(page.getByText(/novedad(?:es)? de OPAI sin leer/)).toHaveCount(0);
    await capturar(page, info, "novedades-bandeja");

    // CAR-430: en el ERP, el avatar (o el botón «Yo» en teléfono) avisa las novedades sin leer.
    await page.goto("/novedades");
    await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
    if ((await pendientes(page)) > 0) {
      const avatarErp = page
        .getByRole("button", { name: /^(Menú de usuario|Yo)/ })
        .filter({ visible: true })
        .first();
      await expect(avatarErp).toHaveAccessibleName(/hay novedades sin leer/, { timeout: 15_000 });
    }
    const filaNovedades = page.getByRole("menuitem", { name: /Novedades/ });
    await abrirMenuUsuario(page, filaNovedades);
    await capturar(page, info, "novedades-menu-cuenta");
    await page.keyboard.press("Escape");

    // Portal sin Bandeja (supervisor), si el usuario lo tiene: el avatar avisa las novedades sin leer.
    // Sin ese portal (el usuario de `qa-e2e` es solo ERP), la página queda en «Sin permisos» y se omite.
    await page.goto("/supervisor/novedades");
    const lista = page.getByText(RESUMEN).first();
    if (
      await lista.waitFor({ timeout: 20_000 }).then(
        () => true,
        () => false,
      )
    ) {
      const avatar = page
        .getByRole("button", { name: /^(Menú de usuario|Yo)/ })
        .filter({ visible: true })
        .first();
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
    // Con avisos o aprobaciones pendientes, el número de la Bandeja va en píldora roja en la barra lateral.
    if (Number(/(\d+)$/.exec((await titulo.textContent()) ?? "")?.[1] ?? 0) > 0)
      await expect(
        page.locator('nav a[href="/bandeja"] .bg-danger-fg').filter({ visible: true }).first(),
      ).toBeVisible({ timeout: 15_000 });

    await page.goto("/novedades");
    await expect(page.getByText(RESUMEN).first()).toBeVisible({ timeout: 30_000 });
    const marcarTodas = page.getByRole("button", { name: "Marcar todas como leídas" });
    const antes = await pendientes(page);
    // Una novedad nueva (por ejemplo la de la propuesta) deja pendientes: no exigimos «Estás al día».
    if (antes > 0 && (await marcarTodas.count())) {
      await marcarTodas.click();
      await expect.poll(() => pendientes(page), { timeout: 30_000 }).toBeLessThan(antes);
    }
    await expect(page.getByText(RESUMEN).first()).toBeVisible();
    await capturar(page, info, "novedades-al-dia");
    expect(errores).toEqual([]);
  });
});
