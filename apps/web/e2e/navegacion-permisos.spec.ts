import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hidratado } from "./hidratacion";
import { entrar } from "./sesion";

test.beforeAll(() => {
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta contraseña E2E");
  execFileSync(
    "pnpm",
    ["--filter", "@opai/auth", "exec", "tsx", "scripts/seed-nav-permisos-e2e.ts"],
    {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, E2E_PASSWORD: password },
      stdio: "inherit",
    },
  );
});

for (const conceder of [false, true]) {
  test(`excepción que ${conceder ? "concede" : "deniega"} Personas`, async ({ page }, info) => {
    await entrar(page, `nav-${conceder ? "concede" : "deniega"}@opai.cl`);
    const nav = page
      .getByRole("navigation", { name: "Principal", exact: true })
      .filter({ visible: true });
    const personas = nav.getByRole("link", { name: "Personas", exact: true });
    if (conceder && info.project.name !== "telefono") {
      const area = nav.getByRole("button", { name: "Personas", exact: true });
      // El riel llega por streaming y en `next dev` se hidrata tarde: se reintenta hasta que el
      // área (o ya su enlace) exista y el clic haya desplegado el área.
      await expect(async () => {
        if (await personas.first().isVisible()) return;
        await expect(area).toBeVisible({ timeout: 2_000 });
        if ((await area.getAttribute("aria-expanded")) !== "true") {
          await hidratado(area);
          await area.click();
        }
        await expect(personas.first()).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 45_000 });
    }
    if (conceder) await expect(personas.first()).toBeVisible();
    else await expect(personas).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`permisos-${conceder}.png`), fullPage: true });
  });
}

for (const conceder of [false, true]) {
  test(`Supervisor limitado ${conceder ? "con permiso" : "sin permiso"} no accede a persona fuera de alcance`, async ({
    page,
  }) => {
    // La primera visita compila en frío la ruta y su 404 (cada intento puede tardar decenas de segundos en el runner).
    test.setTimeout(180_000);
    await entrar(page, `supervisor-nav-${conceder ? "concede" : "deniega"}@opai.cl`);
    // El 404 real lo arma el proxy con un fetch de 4 s: si la ruta compila en frío, cae a 200 y se recarga.
    const noEncontrado = async (id: string) => {
      const titulo = page.getByRole("heading", { name: "No encontrado · Portal Supervisor" });
      await expect(async () => {
        await page.goto(`/supervisor/personas/${id}`);
        await expect(titulo).toBeVisible({ timeout: 8_000 });
      }).toPass({ timeout: 90_000 });
    };
    await noEncontrado("00000000-0000-7000-8000-000000000078");
    await expect(page.getByRole("link", { name: "Subir documento" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pedir" })).toHaveCount(0);
    await noEncontrado("00000000-0000-7000-8000-000000000079");
  });
}

for (const conceder of [false, true]) {
  test(`Supervisor limitado ve persona en alcance ${conceder ? "con" : "sin"} acciones documentales`, async ({
    page,
  }, info) => {
    await entrar(page, `supervisor-nav-${conceder ? "concede" : "deniega"}@opai.cl`);
    await page.goto("/supervisor/personas/00000000-0000-7000-8000-000000000082");
    await expect(
      page.getByRole("heading", { name: "Persona En alcance", exact: true, level: 2 }),
    ).toBeVisible();
    const subir = page.getByRole("link", { name: "Subir documento" });
    if (conceder) await expect(subir).toBeVisible();
    else await expect(subir).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("supervisor-en-alcance.png"), fullPage: true });
  });
}
