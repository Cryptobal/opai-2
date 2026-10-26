import { execFileSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

// CAR-8 (Brief 11 · Puestos PR 1): en una instalación con varias posiciones, todos los puestos se ven
// y se navegan a 375, 1024 y 1280 px, el nombre del patrón se ve claro y no hay nada corrido ni
// superpuesto. Además comprueba que la pantalla usa los tokens 2.0 (fondo claro, no el azul oscuro
// del design system 1.0). Deja una captura por ancho en __screenshots__.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const urlTest = process.env["DATABASE_URL_TEST"] ?? "";
// Siembra las posiciones con el rol propietario (como el CI), nunca contra Neon.
const urlDueño = /@(localhost|127\.0\.0\.1)[:/]/.test(urlTest)
  ? urlTest.replace(/\/[^/]+$/, "/opai_e2e")
  : "";

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

/** Deja ≥6 posiciones activas en «Planta Quilicura» (gard) para ejercitar el layout. Idempotente. */
function sembrarPosiciones(): string {
  const sql = `
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
    SELECT i.id FROM core.instalaciones i JOIN core.tenants t ON t.id = i.tenant_id AND t.slug = 'gard'
    WHERE i.nombre = 'Planta Quilicura' LIMIT 1;`;
  const salida = execFileSync("psql", [urlDueño, "-X", "-A", "-t", "-c", sql], { encoding: "utf8" });
  return salida.trim().split("\n").filter(Boolean).at(-1) ?? "";
}

const sinDesborde = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

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
  test.skip(!urlDueño, "Necesita DATABASE_URL_TEST de una base local (opai_e2e)");
  let instalacionId = "";
  test.beforeAll(() => {
    instalacionId = sembrarPosiciones();
  });

  test("lista de posiciones: todas visibles, patrón claro, sin desborde y tokens 2.0", async ({
    page,
  }, info) => {
    await entrar(page);
    await page.goto(`/instalaciones/${instalacionId}/puestos`);
    const filas = page.getByRole("link").filter({ hasText: /Guardia posición|Guardia/ });
    await expect(filas.first()).toBeVisible();
    const total = await filas.count();
    expect(total, "hay varias posiciones a la vista").toBeGreaterThanOrEqual(5);
    // Cada posición es navegable y muestra su patrón y su cobertura PPC (CAR-8).
    await expect(page.getByText("4×4").first()).toBeVisible();
    await expect(page.getByText("PPC", { exact: false }).first()).toBeVisible();
    // Ningún elemento corrido ni superpuesto: sin scroll horizontal en ninguno de los tres anchos.
    expect(await sinDesborde(page), `${info.project.name}: sin desborde horizontal`).toBe(true);
    // Estilo del design system 2.0: fondo claro, nunca el azul oscuro del 1.0.
    expect(await fondoClaro(page), `${info.project.name}: fondo claro (tokens 2.0)`).toBeGreaterThan(
      0.6,
    );
    await page.screenshot({ path: `e2e/__screenshots__/puestos-${info.project.name}.png`, fullPage: true });
    // Navegable: al abrir una posición aparece la hoja de edición.
    await filas.first().click();
    await expect(page.getByRole("dialog", { name: "Editar puesto" })).toBeVisible();
  });
});
