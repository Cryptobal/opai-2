import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { entrar, ocultarDev, password, sinDesborde, urlSiembra } from "./fixtures-puestos-car8";

const persona = "00000000-0000-7000-8000-000000000082";
const sql = (consulta: string) =>
  execFileSync("psql", [urlSiembra, "-X", "-v", "ON_ERROR_STOP=1", "-c", consulta], {
    stdio: "pipe",
  });
test.beforeAll(() => {
  if (
    !password ||
    !urlSiembra ||
    !["localhost", "127.0.0.1"].includes(new URL(urlSiembra).hostname)
  )
    throw new Error("Requiere e2e local");
  execFileSync(
    "pnpm",
    ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-nav-permisos-e2e.ts"],
    {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, DATABASE_URL_MIGRATE: urlSiembra, E2E_PASSWORD: password },
      stdio: "pipe",
    },
  );
  execFileSync(
    "pnpm",
    ["--filter", "@opai/db", "exec", "tsx", "scripts/seed-vinculo-jornada-e2e.ts"],
    {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, DATABASE_URL_MIGRATE: urlSiembra },
      stdio: "pipe",
    },
  );
});
test("22–25: contrato, jornada, validación y cambio de capa con vista previa", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  sql(
    `UPDATE core.vinculos_laborales SET instalacion_id='00000000-0000-7000-8000-000000000081', puesto_id=NULL, horas_semanales=40, distribucion='Lunes a viernes' WHERE persona_id='${persona}';`,
  );
  await entrar(page);
  await page.goto(`/personas/${persona}/laboral`);
  await ocultarDev(page);
  await expect(page.getByText("40 h semanales · Lunes a viernes")).toBeVisible();
  const metricas = JSON.parse((await page.locator("#opai-metricas-laboral").textContent()) ?? "{}");
  expect(metricas.consultas).toBeGreaterThan(0);
  expect(metricas.consultas).toBeLessThanOrEqual(8);
  info.annotations.push({ type: "consultas-laboral", description: String(metricas.consultas) });
  expect(await sinDesborde(page)).toBe(true);
  await page.screenshot({
    path: info.outputPath("22-23-vinculo.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Editar vínculo", exact: true }).click();
  const hoja = page.getByRole("dialog", { name: "Editar vínculo", exact: true });
  await expect(hoja).toBeVisible();
  await expect(hoja.getByRole("button", { name: "Revisar cambio" })).toBeDisabled();
  await hoja.getByLabel("Horas semanales", { exact: true }).fill("0");
  await expect(hoja.getByRole("button", { name: "Revisar cambio" })).toBeDisabled();
  await expect(hoja.getByText("Ingresa horas enteras entre 1 y 168")).toBeVisible();
  await hoja.getByLabel("Horas semanales", { exact: true }).fill("42");
  await hoja.getByLabel("Distribución", { exact: true }).fill("4×4");
  await hoja.getByLabel("Instalación obligatoria", { exact: true }).click();
  await page.getByRole("option", { name: "Destino vínculo E2E", exact: true }).click();
  await hoja.getByLabel("Puesto (opcional)", { exact: true }).click();
  await page.getByRole("option", { name: "Noche vínculo E2E", exact: true }).click();
  await hoja.getByRole("button", { name: "Revisar cambio" }).click();
  await expect(hoja.getByRole("region", { name: "Vista previa de cambio de capa" })).toBeVisible({
    timeout: 30000,
  });
  await expect(hoja.getByText("Puesto", { exact: true })).toBeVisible();
  await page.screenshot({
    path: info.outputPath("24-25-editar-vista-previa.png"),
    fullPage: true,
    animations: "disabled",
  });
  await hoja.getByRole("button", { name: "Guardar cambio" }).click();
  await expect(hoja).toHaveCount(0);
  await expect(page.getByText("42 h semanales · 4×4")).toBeVisible();
  await page.reload();
  await expect(page.getByText("42 h semanales · 4×4")).toBeVisible();
});

test("25: conflicto de edición visible y hoja accesible en oscuro", async ({ page }, info) => {
  await entrar(page);
  await page.goto(`/personas/${persona}/laboral`);
  await ocultarDev(page);
  await page.getByRole("link", { name: "Editar vínculo", exact: true }).click();
  const hoja = page.getByRole("dialog", { name: "Editar vínculo", exact: true });
  await expect(hoja).toBeVisible();
  await hoja.getByLabel("Horas semanales", { exact: true }).fill("43");
  sql(
    `UPDATE core.vinculos_laborales SET updated_at=clock_timestamp() WHERE persona_id='${persona}';`,
  );
  await hoja.getByRole("button", { name: "Revisar cambio" }).click();
  await expect(
    hoja.getByText("El vínculo cambió. Vuelve a abrirlo y revisa el cambio.", { exact: false }),
  ).toBeVisible({ timeout: 30000 });
  await expect(hoja.getByRole("button", { name: "Revisar cambio" })).toBeEnabled();
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await page.screenshot({
    path: info.outputPath("25-error-oscuro.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(hoja).toHaveCount(0);
});
