import { expect as base, test } from "@playwright/test";

import {
  cambiarEtapa,
  columna,
  crearNegocio,
  dialogo,
  moverDesdeFicha,
  sinDesborde,
  vista,
} from "./negocios-ayuda";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-33 a 375, 1024 y 1280 px (y 384 px en teléfono): cambio Tablero/Lista que conserva filtros y
// etapa, sin desborde horizontal, selector «Etapa visible» que sigue el deslizamiento, «Nuevo negocio»
// con instalaciones de la cuenta y el motivo del botón deshabilitado, y cambio de etapa por arrastre,
// «Mover a…» y desde la ficha, con los requisitos que faltan. Usa la cuenta e instalaciones ficticias de
// seed:maestros-demo; cada proyecto crea sus propios negocios. Capturas en test-results/.
test.use({ actionTimeout: 30_000 });
// Las hojas se descargan al abrirse y en desarrollo se compilan la primera vez: más margen.
const expect = base.configure({ timeout: 30_000 });
test.setTimeout(300_000);

test.describe("Negocios · CAR-33", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Tablero/Lista conserva los filtros y la etapa; la lista vacía no dice «MCP»", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto("/negocios?estado=abierto&q=Rondas");
    await expect(page.getByRole("region", { name: "Tablero de negocios" })).toBeVisible();
    const etapa = await columna(page, "Calificado").getAttribute("data-etapa");
    await sinDesborde(page);

    await vista(page).getByRole("link", { name: "Lista" }).click();
    await page.waitForURL((u) => u.searchParams.get("vista") === "lista");
    const u = new URL(page.url());
    expect(u.searchParams.get("q")).toBe("Rondas");
    expect(u.searchParams.get("estado")).toBe("abierto");
    await expect(page.getByText("Rondas nocturnas · CD Pudahuel").first()).toBeVisible();
    await expect(vista(page).getByRole("link", { name: "Tablero" })).toBeVisible();
    await sinDesborde(page);
    await page.screenshot({ path: info.outputPath("lista-con-vista.png") });

    // Volver al tablero conserva los filtros; con ?etapa= la lista filtra por esa etapa.
    await vista(page).getByRole("link", { name: "Tablero" }).click();
    await page.waitForURL((x) => x.pathname === "/negocios" && !x.searchParams.has("vista"));
    expect(new URL(page.url()).searchParams.get("q")).toBe("Rondas");
    await expect(page.getByRole("region", { name: "Tablero de negocios" })).toBeVisible();
    await page.goto(`/negocios?etapa=${etapa}`);
    await vista(page).getByRole("link", { name: "Lista" }).click();
    await page.waitForURL((x) => x.searchParams.get("etapa") === etapa);
    await expect(page.getByText("Rondas nocturnas · CD Pudahuel").first()).toBeVisible();
    await expect(page.getByText("Guardias 24/7 · Planta Quilicura")).toHaveCount(0);

    await page.goto("/negocios?vista=lista&q=sin-resultados-car33");
    await expect(page.getByText("Los negocios que crees aparecerán aquí.")).toBeVisible();
    await expect(page.getByText(/MCP/)).toHaveCount(0);
  });

  test("teléfono: el selector de etapa sigue el deslizamiento y se conserva al volver", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "telefono", "Una columna a la vez solo en teléfono");
    for (const ancho of [375, 384]) {
      await page.setViewportSize({ width: ancho, height: 812 });
      if (ancho === 375) await entrar(page);
      await page.goto("/negocios");
      const selector = page.getByLabel("Etapa visible");
      await expect(selector).toContainText("Prospecto");
      await sinDesborde(page);
      // Deslizar hasta «Calificado»: el selector y la URL la siguen.
      await columna(page, "Calificado").evaluate((c) =>
        c.scrollIntoView({ block: "nearest", inline: "start" }),
      );
      await expect(selector).toContainText("Calificado");
      await page.waitForURL((u) => u.searchParams.has("etapa"));
      await sinDesborde(page);
      await page.screenshot({ path: info.outputPath(`tablero-${ancho}.png`) });
      // Lista y de vuelta: la etapa se conserva y la columna vuelve a la vista.
      const lista = vista(page).getByRole("link", { name: "Lista" });
      await expect(lista).toHaveAttribute("href", /etapa=/);
      await lista.click();
      await page.waitForURL((u) => u.searchParams.get("vista") === "lista");
      await sinDesborde(page);
      await vista(page).getByRole("link", { name: "Tablero" }).click();
      await expect(page.getByLabel("Etapa visible")).toContainText("Calificado");
      await expect(columna(page, "Calificado")).toBeInViewport({ ratio: 0.6 });
      // Abrir una tarjeta y volver con «Atrás» también vuelve a la misma columna.
      await columna(page, "Calificado").getByRole("link").first().click();
      await page.waitForURL(/\/negocios\/[0-9a-f-]{36}/);
      await sinDesborde(page);
      await page
        .getByRole("link", { name: /Negocios/ })
        .first()
        .click();
      await expect(page.getByLabel("Etapa visible")).toContainText("Calificado");
      await expect(columna(page, "Calificado")).toBeInViewport({ ratio: 0.6 });
    }
  });

  test("nuevo negocio con instalaciones y cambio de etapa (arrastre, «Mover a…» y ficha)", async ({
    page,
  }, info) => {
    const id = `${info.project.name} ${Date.now().toString(36)}`;
    const foto = (n: string) => page.screenshot({ path: info.outputPath(`${n}.png`) });
    await entrar(page);

    // El botón deshabilitado explica qué falta.
    await page.goto("/negocios?nuevo=1");
    const falta = dialogo(page).getByText(/^Para crear el negocio falta/);
    await expect(falta).toContainText("elegir la cuenta");
    await dialogo(page).getByLabel("Nombre del negocio").fill("ab");
    await expect(falta).toContainText("mínimo 3 caracteres, van 2");
    await expect(dialogo(page).getByRole("button", { name: "Instalaciones" })).toBeDisabled();
    await sinDesborde(page);
    await foto("nuevo-falta");

    // Con dos instalaciones de la cuenta: quedan vinculadas al crearlo.
    const conInst = `CAR-33 con instalaciones ${id}`;
    await crearNegocio(page, conInst, ["Planta Quilicura", "CD Pudahuel"]);
    await expect(page.getByText("Instalaciones (2)")).toBeVisible();
    await expect(page.getByRole("link", { name: "CD Pudahuel", exact: true })).toBeVisible();
    await foto("ficha-con-instalaciones");

    // Desde la ficha: a una etapa abierta sin requisitos, directo.
    await moverDesdeFicha(page, "Calificado");
    await expect(cambiarEtapa(page)).toContainText("Calificado");
    // A una que pide monto: la hoja Mover lo pide.
    await moverDesdeFicha(page, "Visita técnica");
    await dialogo(page).getByLabel("Valor mensual estimado").fill("1800000");
    await foto("ficha-mover");
    await dialogo(page).getByRole("button", { name: "Mover", exact: true }).click();
    await expect(cambiarEtapa(page)).toContainText("Visita técnica");
    await sinDesborde(page);

    // Sin instalación: salir de la primera etapa la pide (R10), por arrastre o «Mover a…».
    const sinInst = `CAR-33 sin instalación ${id}`;
    await crearNegocio(page, sinInst);
    await expect(page.getByText("Instalaciones (0)")).toBeVisible();
    await page.goto("/negocios");
    const tarjeta = page.getByRole("article", { name: sinInst });
    if (info.project.name === "telefono") {
      await page.getByRole("button", { name: `Mover ${sinInst} a…` }).click();
      await page.getByRole("menuitem", { name: "Calificado" }).click();
    } else {
      await tarjeta.dragTo(columna(page, "Calificado"));
    }
    await expect(dialogo(page).getByText("Vincula una instalación antes de avanzar")).toBeVisible();
    await expect(dialogo(page).getByRole("button", { name: "Mover", exact: true })).toBeDisabled();
    await foto("mover-sin-instalacion");
    await dialogo(page).getByRole("button", { name: "Cancelar" }).click();
    await expect(columna(page, "Prospecto").getByRole("article", { name: sinInst })).toBeAttached();
  });
});
