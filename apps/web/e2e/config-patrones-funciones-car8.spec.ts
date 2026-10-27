import { execFileSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

import { entrar, password, urlSiembra } from "./fixtures-puestos-car8";

// Brief 11 · Puestos PR 1 (CAR-8), diseño DS 2.0 aprobado (t436u): Configuración › Patrones de turno
// y Funciones se ve y se navega a 375, 1024 y 1280 px, con la vista de ciclo clara, sin desborde y con
// los tokens 2.0 (fondo claro). La hoja de edición abre sobre el encabezado y un patrón en uso no
// cambia su estructura (EN_USO). Deja capturas por ancho (y una oscura) en __screenshots__.

/** Asegura un patrón 4×4 en uso y ≥1 función en gard (para EN_USO y la pestaña Funciones). Idempotente. */
function sembrarUso(): void {
  // Fija el tenant gard para que opai_app (CI) pueda insertar bajo RLS; inocuo para el rol propietario.
  const sql = `
    SELECT set_config('app.tenant_id', (SELECT id::text FROM core.tenants WHERE slug = 'gard'), false);
    INSERT INTO core.funciones_puesto (id, tenant_id, nombre, activo, orden, created_at, updated_at)
    SELECT gen_random_uuid(), t.id, f.nombre, true, f.orden, now(), now()
    FROM core.tenants t
      CROSS JOIN (VALUES ('Guardia', 0), ('Supervisor', 1)) AS f(nombre, orden)
    WHERE t.slug = 'gard'
    ON CONFLICT (tenant_id, nombre) DO NOTHING;
    WITH inst AS (
      SELECT i.id, i.tenant_id FROM core.instalaciones i
      JOIN core.tenants t ON t.id = i.tenant_id AND t.slug = 'gard'
      WHERE i.nombre = 'Planta Quilicura' LIMIT 1
    )
    INSERT INTO core.puestos
      (id, tenant_id, instalacion_id, cargo_id, patron_id, nombre, dias_trabajo, dias_descanso,
       hora_inicio, hora_fin, jornada, dotacion, estado, cobertura, cobertura_motivo,
       colacion_min, colacion_fuera, created_at, updated_at)
    SELECT gen_random_uuid(), inst.tenant_id, inst.id,
      (SELECT id FROM core.cargos WHERE tenant_id = inst.tenant_id ORDER BY orden LIMIT 1),
      (SELECT id FROM core.patrones_turno WHERE tenant_id = inst.tenant_id AND nombre = '4×4'),
      'Config patrón en uso', 4, 4, '08:00', '20:00', 'dia', 1, 'activo', 'ppc', 'sin_asignar',
      60, false, now(), now()
    FROM inst
    ON CONFLICT (tenant_id, instalacion_id, nombre) DO NOTHING;`;
  execFileSync("psql", [urlSiembra, "-X", "-A", "-t", "-c", sql], { encoding: "utf8" });
}

const sinDesborde = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );

const fondoClaro = (page: Page) =>
  page.evaluate(() => {
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g) ?? ["0", "0", "0"];
    const [r, g, b] = m.map(Number) as [number, number, number];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });

const ocultarDev = (page: Page) =>
  page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("CAR-8 · Configuración de patrones y funciones (DS 2.0)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.skip(
    !urlSiembra,
    "Necesita una base local (DATABASE_URL_TEST o DATABASE_URL sobre opai_e2e)",
  );
  test.beforeAll(() => sembrarUso());

  test("patrones y funciones: se ven, sin desborde, tokens 2.0, y la hoja en uso bloquea la forma", async ({
    page,
  }, info) => {
    await entrar(page);

    // Pestaña Patrones de turno.
    await page.goto("/configuracion/operaciones?tab=patrones");
    await expect(page.getByText("4×4").first()).toBeVisible();
    // La vista de ciclo es accesible (role="img" con el texto del ciclo).
    await expect(page.getByRole("img", { name: /días de trabajo y/ }).first()).toBeVisible();
    expect(await sinDesborde(page), `${info.project.name}: sin desborde`).toBe(true);
    expect(await fondoClaro(page), `${info.project.name}: tokens 2.0`).toBeGreaterThan(0.6);
    await ocultarDev(page);
    await page.screenshot({
      path: `e2e/__screenshots__/config-patrones-${info.project.name}.png`,
      fullPage: true,
    });

    // Pestaña Funciones.
    await page.goto("/configuracion/operaciones?tab=funciones");
    await expect(page.getByText("Guardia").first()).toBeVisible();
    expect(await sinDesborde(page), `${info.project.name}: funciones sin desborde`).toBe(true);
    await ocultarDev(page);
    await page.screenshot({
      path: `e2e/__screenshots__/config-funciones-${info.project.name}.png`,
      fullPage: true,
    });

    // Editar el patrón 4×4 (en uso): la hoja abre por encima y bloquea cambiar la estructura.
    await page.goto("/configuracion/operaciones?tab=patrones");
    await page.getByRole("link", { name: /4×4/ }).first().click();
    const hoja = page.getByRole("dialog", { name: "Editar patrón" });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByText("Patrón en uso")).toBeVisible();
    await ocultarDev(page);
    await page.screenshot({
      path: `e2e/__screenshots__/config-patron-editar-${info.project.name}.png`,
      fullPage: true,
    });

    // Modo oscuro (solo escritorio): los tokens 2.0 pintan oscuro sin tocar el marcado.
    if (info.project.name === "desktop") {
      await page.goto("/configuracion/operaciones?tab=patrones");
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await expect(page.getByText("4×4").first()).toBeVisible();
      expect(await fondoClaro(page), "oscuro: fondo oscuro").toBeLessThan(0.3);
      await ocultarDev(page);
      await page.screenshot({
        path: "e2e/__screenshots__/config-patrones-oscuro.png",
        fullPage: true,
      });
    }
  });
});
