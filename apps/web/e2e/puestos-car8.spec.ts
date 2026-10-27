import { execFileSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

import { entrar, ocultarDev, password, sinDesborde, urlSiembra } from "./fixtures-puestos-car8";
import { comprobarEstadoVisible, comprobarFiltrosPuestos } from "./puestos-filtros-qa";

// CAR-8 (Brief 11 · Puestos PR 1): en una instalación con varias posiciones, todos los puestos se ven
// y se navegan a 375, 1024 y 1280 px, el patrón se ve claro y nada se corre ni se superpone. Desde
// tablet la lista es una Table del DS (t436u) con buscador y chips; en teléfono, filas con buscador y
// chips. Comprueba también los tokens 2.0 (fondo claro), el estado vacío y el modo oscuro.

/** Ejecuta SQL de siembra con el tenant `gard` fijado (necesario para opai_app bajo RLS; inocuo para el dueño). */
function sembrar(sql: string): string {
  const conTenant = `SELECT set_config('app.tenant_id', (SELECT id::text FROM core.tenants WHERE slug = 'gard'), false);\n${sql}`;
  const salida = execFileSync("psql", [urlSiembra, "-X", "-A", "-t", "-c", conTenant], {
    encoding: "utf8",
  });
  return salida.trim().split("\n").filter(Boolean).at(-1) ?? "";
}

/** Deja ≥6 posiciones activas en «Planta Quilicura» (gard) para ejercitar el layout. Idempotente. */
function sembrarPosiciones(): string {
  return sembrar(`
    WITH inst AS (
      SELECT i.id, i.tenant_id
      FROM core.instalaciones i JOIN core.tenants t ON t.id = i.tenant_id AND t.slug = 'gard'
      WHERE i.nombre = 'Planta Quilicura' LIMIT 1
    )
    INSERT INTO core.puestos
      (id, tenant_id, instalacion_id, cargo_id, patron_id, nombre, dias_trabajo, dias_descanso,
       hora_inicio, hora_fin, jornada, dotacion, estado, cobertura, cobertura_motivo,
       colacion_min, colacion_fuera, created_at, updated_at)
    SELECT gen_random_uuid(), inst.tenant_id, inst.id,
      (SELECT id FROM core.cargos WHERE tenant_id = inst.tenant_id ORDER BY orden LIMIT 1),
      (SELECT id FROM core.patrones_turno WHERE tenant_id = inst.tenant_id AND nombre = '4×4'),
      'Guardia posición ' || g, 4, 4, '08:00', '20:00', 'dia', 1, 'activo', 'ppc', 'sin_asignar',
      60, false, now(), now()
    FROM inst CROSS JOIN generate_series(1, 5) g
    ON CONFLICT (tenant_id, instalacion_id, nombre) DO NOTHING;
    -- El caso más largo (rotación día y noche con horas) y uno inactivo, para QA B2 y el punto 3.
    WITH inst AS (
      SELECT i.id, i.tenant_id
      FROM core.instalaciones i JOIN core.tenants t ON t.id = i.tenant_id AND t.slug = 'gard'
      WHERE i.nombre = 'Planta Quilicura' LIMIT 1
    )
    INSERT INTO core.puestos
      (id, tenant_id, instalacion_id, cargo_id, patron_id, nombre, dias_trabajo, dias_descanso,
       hora_inicio, hora_fin, hora_inicio_noche, hora_fin_noche, jornada, horas_semanales, dotacion,
       estado, cobertura, cobertura_motivo, colacion_min, colacion_fuera, created_at, updated_at)
    SELECT gen_random_uuid(), inst.tenant_id, inst.id,
      (SELECT id FROM core.cargos WHERE tenant_id = inst.tenant_id ORDER BY orden LIMIT 1),
      (SELECT id FROM core.patrones_turno WHERE tenant_id = inst.tenant_id AND nombre = '14×14'),
      v.nombre, 14, 14, '08:00', '20:00', '20:00', '08:00', 'rotativa', 38.5, 1, v.estado, 'ppc',
      'sin_asignar', 60, false, now(), now()
    FROM inst CROSS JOIN (VALUES ('A Guardia rotativa', 'activo'), ('A Guardia retirada', 'inactivo'))
      AS v(nombre, estado)
    ON CONFLICT (tenant_id, instalacion_id, nombre) DO NOTHING;
    SELECT i.id FROM core.instalaciones i JOIN core.tenants t ON t.id = i.tenant_id AND t.slug = 'gard'
    WHERE i.nombre = 'Planta Quilicura' LIMIT 1;`);
}

/** Una instalación de gard sin ningún puesto, para el estado vacío. Idempotente. */
function sembrarVacia(): string {
  return sembrar(`
    INSERT INTO core.instalaciones (id, tenant_id, cuenta_id, nombre, estado, geocerca_m, created_at, updated_at)
    SELECT gen_random_uuid(), t.id,
      (SELECT id FROM core.cuentas WHERE tenant_id = t.id ORDER BY created_at LIMIT 1),
      'QA sin puestos', 'activa', 1000, now(), now()
    FROM core.tenants t WHERE t.slug = 'gard'
    ON CONFLICT (tenant_id, cuenta_id, nombre) DO NOTHING;
    SELECT i.id FROM core.instalaciones i JOIN core.tenants t ON t.id = i.tenant_id AND t.slug = 'gard'
    WHERE i.nombre = 'QA sin puestos' LIMIT 1;`);
}

/** Luminancia del fondo del body: los tokens 2.0 son claros (>0.6); el 1.0 era azul oscuro (<0.2). */
const fondoClaro = (page: Page) =>
  page.evaluate(() => {
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g) ?? ["0", "0", "0"];
    const [r, g, b] = m.map(Number) as [number, number, number];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("CAR-8 · puestos como posición se ven y se navegan", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.skip(
    !urlSiembra,
    "Necesita una base local (DATABASE_URL_TEST o DATABASE_URL sobre opai_e2e)",
  );
  let instalacionId = "";
  let vaciaId = "";
  test.beforeAll(() => {
    instalacionId = sembrarPosiciones();
    vaciaId = sembrarVacia();
  });

  test("los filtros de puestos no alteran la lista de instalaciones", async ({ page }, info) => {
    await comprobarFiltrosPuestos(page, instalacionId, info.project.name);
  });

  test("lista de posiciones: todas visibles, patrón claro, sin desborde y tokens 2.0", async ({ page }, info) => {
    const telefono = info.project.name === "telefono";
    await entrar(page);
    await page.goto(`/instalaciones/${instalacionId}/puestos`);
    const filas = page.getByRole("link").filter({ hasText: /Guardia posición|Guardia/ });
    await expect(filas.first()).toBeVisible();
    const total = await filas.count();
    expect(total, "hay varias posiciones a la vista").toBeGreaterThanOrEqual(5);
    // Cada posición muestra su patrón y su cobertura PPC (CAR-8). (La lista oculta del otro ancho
    // queda en el DOM, así que se filtra por visibilidad.)
    await expect(page.getByText("4×4").filter({ visible: true }).first()).toBeVisible();
    // En teléfono el badge dice «PPC» (corto); desde md, «PPC · Sin asignar». Siempre hay uno visible.
    await expect(page.getByText(/^PPC/).filter({ visible: true }).first()).toBeVisible();
    if (!telefono) await comprobarEstadoVisible(page);
    // Nombre accesible completo también en teléfono (QA B2 y punto 9).
    await expect(page.getByText("PPC · Sin asignar").first()).toBeAttached();
    // Buscador y chips en los tres anchos (QA H1).
    await expect(page.getByPlaceholder("Nombre del puesto")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Detalle" }).getByRole("button", { name: /^Filtrar por/i }),
    ).toHaveCount(3);
    // Ningún elemento corrido ni superpuesto: sin scroll horizontal en ninguno de los tres anchos.
    expect(await sinDesborde(page), `${info.project.name}: sin desborde horizontal`).toBe(true);
    // Estilo del design system 2.0: fondo claro, nunca el azul oscuro del 1.0.
    expect(
      await fondoClaro(page),
      `${info.project.name}: fondo claro (tokens 2.0)`,
    ).toBeGreaterThan(0.6);
    // QA B2: a 375 px el horario, el patrón y las horas no se cortan (bajan de renglón) en las filas.
    const cortadas = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-linea-puesto]")]
        .flatMap((el) => [el, el.parentElement])
        .filter((el): el is HTMLElement => el !== null && el.scrollWidth > el.clientWidth)
        .map((el) => el.textContent),
    );
    expect(cortadas, `${info.project.name}: líneas secundarias sin cortar`).toEqual([]);
    // Horario nocturno: en teléfono el texto trae «(+1)»; desde md, un badge «+1 día» en la tabla.
    const noche = telefono ? page.getByText("20:00–08:00 (+1)") : page.getByText("+1 día");
    await expect(noche.first()).toBeVisible();
    // Punto 3: el inactivo se ve como «Inactivo» (no como PPC) y va al final.
    const ultimo = telefono
      ? page
          .getByRole("link")
          .filter({ hasText: /Guardia/ })
          .last()
      : page.getByRole("row").filter({ hasText: "A Guardia retirada" });
    await expect(ultimo).toContainText("A Guardia retirada");
    await expect(ultimo).toContainText("Inactivo");
    await ocultarDev(page);
    await page.screenshot({
      path: `e2e/__screenshots__/puestos-${info.project.name}.png`,
      fullPage: true,
    });
    // Navegable: al abrir una posición aparece la hoja de edición.
    await filas.first().click();
    await expect(page.getByRole("dialog", { name: "Editar puesto" })).toBeVisible({
      timeout: 20_000,
    });

    // Estado vacío: una instalación sin puestos invita a crear el primero.
    await page.goto(`/instalaciones/${vaciaId}/puestos`);
    await expect(page.getByText("Sin puestos", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Nuevo puesto/ })).toBeVisible();
    expect(await sinDesborde(page), `${info.project.name}: vacío sin desborde`).toBe(true);
    await ocultarDev(page);
    await page.screenshot({
      path: `e2e/__screenshots__/puestos-vacio-${info.project.name}.png`,
      fullPage: true,
    });

    // Modo oscuro (solo escritorio): los tokens 2.0 pintan oscuro sin tocar el marcado.
    if (info.project.name === "desktop") {
      await page.goto(`/instalaciones/${instalacionId}/puestos`);
      await expect(page.getByText("4×4").filter({ visible: true }).first()).toBeVisible();
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      expect(await fondoClaro(page), "oscuro: fondo oscuro").toBeLessThan(0.3);
      await ocultarDev(page);
      await page.screenshot({ path: "e2e/__screenshots__/puestos-oscuro.png", fullPage: true });
    }
  });
});
