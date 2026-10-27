import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { entrar, ocultarDev, password, sinDesborde, urlSiembra } from "./fixtures-puestos-car8";

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);
const idDe = (tabla: string) =>
  execFileSync(
    "psql",
    [
      urlSiembra,
      "-XAt",
      "-c",
      `SELECT id FROM core.${tabla} WHERE tenant_id = (SELECT id FROM core.tenants WHERE slug='gard') ORDER BY id LIMIT 1`,
    ],
    { encoding: "utf8" },
  ).trim();

test("capas completas, vista previa, historial y resolución sin herencia", async ({
  page,
}, info) => {
  test.skip(!password || !urlSiembra, "Requiere usuario y base local de e2e");
  const instalacion = idDe("instalaciones");
  const persona = idDe("personas");
  expect(instalacion).toMatch(/^[0-9a-f-]{36}$/);
  await entrar(page);
  await page.goto(`/instalaciones/${instalacion}/sueldo`);
  await ocultarDev(page);
  await expect(
    page.getByRole("heading", { name: "Sueldo de instalación", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  await page.getByRole("link", { name: /Definir sueldo|Nueva versión/ }).click();
  const hoja = page.getByRole("dialog", { name: "Nueva versión de sueldo" });
  await expect(hoja).toBeVisible();
  await hoja.getByLabel("Sueldo base", { exact: true }).fill("650000");
  await hoja.getByLabel("Colación", { exact: true }).fill("0");
  await hoja.getByLabel("Movilización", { exact: true }).fill("0");
  const dia = info.project.name === "telefono" ? "01" : info.project.name === "ipad" ? "02" : "03";
  await hoja
    .getByLabel("Vigente desde")
    .fill(`${dia}-01-${2200 + (Math.floor(Date.now() / 60000) % 1000)}`);
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
  await page.screenshot({
    path: `e2e/__screenshots__/07b-rut-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
    timeout: 60000,
  });
});
