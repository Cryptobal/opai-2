import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { entrar, ocultarDev, password, sinDesborde, urlSiembra } from "./fixtures-puestos-car8";

test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);
const consultar = (sql: string) =>
  execFileSync(
    "psql",
    [
      urlSiembra,
      "-XAt",
      "-c",
      `SELECT set_config('app.tenant_id', (SELECT id::text FROM core.tenants WHERE slug = 'gard'), false);
       ${sql}`,
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .slice(1)
    .at(-1) ?? "";
const idDe = (tabla: "instalaciones" | "personas") =>
  consultar(`SELECT id FROM core.${tabla} WHERE tenant_id = (SELECT id FROM core.tenants WHERE slug = 'gard')
    AND ${tabla === "instalaciones" ? "nombre = 'Planta Quilicura'" : "nombres = 'María Fernanda' AND apellidos = 'Soto'"} LIMIT 1`);

test("capas completas, vista previa, historial y resolución sin herencia", async ({
  page,
}, info) => {
  test.skip(!password || !urlSiembra, "Requiere usuario y base local de e2e");
  const instalacion = idDe("instalaciones");
  const persona = idDe("personas");
  expect(instalacion).toMatch(/^[0-9a-f-]{36}$/);
  expect(persona).toMatch(/^[0-9a-f-]{36}$/);
  const fecha =
    consultar(`SELECT (GREATEST(CURRENT_DATE, COALESCE(MAX(vigente_desde), CURRENT_DATE)) + 1)::text
    FROM core.estructuras_sueldo WHERE tenant_id = (SELECT id FROM core.tenants WHERE slug = 'gard')
    AND (instalacion_id = '${instalacion}' OR persona_id = '${persona}')`);
  expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const [anio, mes, dia] = fecha.split("-");
  await entrar(page);
  await page.goto(`/instalaciones/${instalacion}/sueldo`);
  await ocultarDev(page);
  await expect(
    page.getByRole("heading", { name: "Sueldo de instalación", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  const metricas = await page.locator("#opai-metricas-sueldo").textContent();
  info.annotations.push({
    type: "rendimiento-instalacion",
    description: metricas ?? "Marcador ausente",
  });
  const conteo = JSON.parse(metricas ?? "{}").consultas as number;
  expect(conteo).toBeGreaterThan(0);
  expect(conteo).toBeLessThanOrEqual(8);
  await page.getByRole("link", { name: /Definir sueldo|Nueva versión/ }).click();
  const hoja = page.getByRole("dialog", { name: "Nueva versión de sueldo" });
  await expect(hoja).toBeVisible();
  const monto = hoja.getByLabel("Sueldo base (obligatorio)", { exact: true });
  for (const valor of ["10,5", "1.000", "999999", "100.000.000", "0"]) {
    await monto.fill("");
    await monto.pressSequentially(valor);
    await expect(monto).toHaveValue(valor);
  }
  await monto.fill("650000");
  await hoja.getByLabel("Colación (obligatorio)", { exact: true }).fill("0");
  await hoja.getByLabel("Movilización (obligatorio)", { exact: true }).fill("0");
  await hoja.getByLabel("Vigente desde (obligatorio)").fill(`${dia}-${mes}-${anio}`);
  await hoja.getByRole("button", { name: "Revisar cambio" }).click();
  const confirmar = page.getByRole("dialog", { name: "Confirmar versión de sueldo" });
  await expect(confirmar).toBeVisible();
  await expect(confirmar.getByText(/pendientes de vínculo con instalación/)).toBeVisible();
  await page.screenshot({
    path: `e2e/__screenshots__/07b-impacto-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
    timeout: 60000,
  });
  await confirmar.getByRole("button", { name: "Guardar versión" }).click();
  await expect(confirmar).toHaveCount(0);
  await expect(page.getByLabel("Versiones por vigencia")).toBeVisible();
  expect(await sinDesborde(page)).toBe(true);
  await page.screenshot({
    path: `e2e/__screenshots__/07b-instalacion-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
    timeout: 60000,
  });
  await page.goto(`/personas/${persona}/sueldo`);
  await expect(page.getByRole("list", { name: "Capas de sueldo" })).toBeVisible();
  await page.getByRole("link", { name: "Definir sueldo por RUT", exact: true }).click();
  const rut = page.getByRole("dialog", { name: "Definir sueldo por RUT" });
  await expect(rut.getByRole("button", { name: "Revisar cambio" })).toBeDisabled();
  await expect(rut.getByLabel("Motivo obligatorio")).toBeVisible();
  await rut.getByLabel("Sueldo base (obligatorio)", { exact: true }).fill("10,5");
  await expect(rut.getByText("Solo pesos enteros, sin decimales ni signo")).toBeVisible();
  await expect(rut.getByRole("button", { name: "Revisar cambio" })).toBeDisabled();
  await rut.getByLabel("Sueldo base (obligatorio)", { exact: true }).fill("700000");
  await rut.getByLabel("Colación (obligatorio)", { exact: true }).fill("0");
  await rut.getByLabel("Movilización (obligatorio)", { exact: true }).fill("0");
  await rut.getByLabel("Vigente desde (obligatorio)").fill(`${dia}-${mes}-${anio}`);
  await rut.getByLabel("Motivo obligatorio").fill("Acuerdo individual de prueba E2E");
  await rut.getByRole("button", { name: "Revisar cambio" }).click();
  await confirmar.getByRole("button", { name: "Guardar versión" }).click();
  await expect(confirmar).toHaveCount(0);
  await page.goto(`/personas/${persona}/sueldo?fecha=${fecha}&instalacion=${instalacion}`);
  await expect(
    page
      .getByRole("list", { name: "Capas de sueldo" })
      .locator("li")
      .filter({ hasText: "Sueldo por RUT" })
      .getByText("Rige", { exact: true }),
  ).toBeVisible();
  const metricasPersona = await page.locator("#opai-metricas-sueldo").textContent();
  info.annotations.push({
    type: "rendimiento-persona",
    description: metricasPersona ?? "Marcador ausente",
  });
  const conteoPersona = JSON.parse(metricasPersona ?? "{}").consultas as number;
  expect(conteoPersona).toBeGreaterThan(0);
  expect(conteoPersona).toBeLessThanOrEqual(8);
  expect(await sinDesborde(page)).toBe(true);
  await page.screenshot({
    path: `e2e/__screenshots__/07b-rut-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
    timeout: 60000,
  });
});
