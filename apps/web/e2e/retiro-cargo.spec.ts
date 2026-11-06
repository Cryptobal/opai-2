import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { entrar, ocultarDev, password, sinDesborde, urlSiembra } from "./fixtures-puestos-car8";

// Semilla solo en Postgres local; nunca ejecuta mantenimiento en Neon.
const sql = (consulta: string) =>
  execFileSync("psql", [urlSiembra, "-XAt", "-v", "ON_ERROR_STOP=1", "-c", consulta], {
    encoding: "utf8",
  }).trim();
test.setTimeout(180000);
test("18–21: catálogo sin montos e historial retirado, sin crear/versionar", async ({
  page,
}, info) => {
  test.skip(!password || !urlSiembra, "Requiere la base y el usuario locales de e2e");
  const cargo = randomUUID();
  const persona = randomUUID();
  const vinculo = randomUUID();
  const estructura = randomUUID();
  try {
    sql(`BEGIN;
      SELECT set_config('app.tenant_id', (SELECT id::text FROM core.tenants WHERE slug='gard'), true);
      INSERT INTO core.cargos (id, tenant_id, nombre, updated_at)
      SELECT '${cargo}', id, 'Cargo e2e ${cargo}', now() FROM core.tenants WHERE slug='gard';
      INSERT INTO core.personas (id, tenant_id, nombres, apellidos, rut, updated_at)
      SELECT '${persona}', id, 'Persona', 'E2E', '${persona}', now() FROM core.tenants WHERE slug='gard';
      INSERT INTO core.vinculos_laborales (id, tenant_id, persona_id, cargo_id, tipo, inicio, estado, updated_at)
      SELECT '${vinculo}', id, '${persona}', '${cargo}', 'indefinido', '2024-01-01', 'vigente', now()
      FROM core.tenants WHERE slug='gard';
      INSERT INTO core.estructuras_sueldo (id,tenant_id,nivel,cargo_id,sueldo_base,colacion,movilizacion,gratificacion,vigente_desde,estado,created_at,updated_at)
      SELECT '${estructura}', id, 'cargo', '${cargo}', 543210, 10000, 20000, 'ninguna', '2024-01-01', 'archivada', now(), now()
      FROM core.tenants WHERE slug='gard';
      COMMIT;`);
    await entrar(page);
    await page.goto("/cargos");
    await ocultarDev(page);
    await expect(page.getByRole("region", { name: "Lista de cargos" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /Sueldo base|Colación|Movilización|Gratificación/ }),
    ).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("543.210");
    // Con la acción «Nuevo» flotante (teléfono e iPad) la cabecera de la lista se oculta bajo lg; el título
    // va en la barra superior desde md. En teléfono la lista se identifica por su región.
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await expect(
        page.getByRole("heading", { name: "Cargos", exact: true }).filter({ visible: true }),
      ).toBeVisible();
    }
    const consultas = async () => {
      const valor = JSON.parse((await page.locator("#opai-metricas").textContent()) ?? "{}")
        .consultas as number;
      expect(valor).toBeGreaterThan(0);
      expect(valor).toBeLessThanOrEqual(8);
      return valor;
    };
    info.annotations.push({ type: "consultas-lista", description: String(await consultas()) });
    expect(await sinDesborde(page)).toBe(true);
    await page.screenshot({
      path: `e2e/__screenshots__/07b-cargos-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.goto(`/cargos/${cargo}?version=1`);
    await expect(page.getByText("Estructuras antiguas del cargo", { exact: true })).toBeVisible();
    // La nota de retiro vive en la ficha del cargo (la lista ya no lleva aviso).
    await expect(
      page.getByText("Los sueldos se definen en instalación, puesto o persona.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Crear versión|Nueva versión/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Crear versión|Anular|Borrar/ })).toHaveCount(0);
    const detalle = page.locator("details").filter({ hasText: "Versión del 01-01-2024" });
    await expect(detalle).not.toHaveAttribute("open", "");
    // Si el foco se pierde por un render tardío de `next dev`, la tecla no llega al resumen: se reintenta
    // solo mientras siga cerrado (Enter sobre uno abierto lo cerraría).
    await expect(async () => {
      if ((await detalle.getAttribute("open")) === null) {
        await detalle.locator("summary").focus();
        await page.keyboard.press("Enter");
      }
      await expect(detalle).toHaveAttribute("open", "", { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect(detalle).toContainText("543.210");
    await expect(detalle).toContainText("Solo lectura · sin edición ni borrado");
    info.annotations.push({ type: "consultas-detalle", description: String(await consultas()) });
    expect(await sinDesborde(page)).toBe(true);
    await page.screenshot({
      path: `e2e/__screenshots__/07b-cargo-archivo-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await page.screenshot({
      path: `e2e/__screenshots__/07b-cargo-archivo-oscuro-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.goto(`/personas/${persona}/sueldo`);
    await expect(page.getByText("Capa cargo (retirada)", { exact: true })).toBeVisible();
    const consultasPersona = JSON.parse(
      (await page.locator("#opai-metricas-sueldo").textContent()) ?? "{}",
    ).consultas as number;
    expect(consultasPersona).toBeGreaterThan(0);
    expect(consultasPersona).toBeLessThanOrEqual(8);
    info.annotations.push({ type: "consultas-persona", description: String(consultasPersona) });
    await expect(
      page.getByRole("link", { name: "Ver estructuras antiguas del cargo" }),
    ).toHaveAttribute("href", `/cargos/${cargo}`);
    expect(await sinDesborde(page)).toBe(true);
    await page.screenshot({
      path: `e2e/__screenshots__/07b-persona-cargo-retirado-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("link", { name: "Ver estructuras antiguas del cargo" }).click();
    // Navegación del cliente a la ficha del cargo: en dev puede pasar de 5 s.
    await expect(page.getByText("Estructuras antiguas del cargo", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  } finally {
    sql(`BEGIN;
      SELECT set_config('app.tenant_id', (SELECT id::text FROM core.tenants WHERE slug='gard'), true);
      DELETE FROM core.estructuras_sueldo WHERE id='${estructura}';
      DELETE FROM core.vinculos_laborales WHERE id='${vinculo}';
      DELETE FROM core.personas WHERE id='${persona}';
      DELETE FROM core.cargos WHERE id='${cargo}';
      COMMIT;`);
  }
});
