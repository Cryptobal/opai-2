import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { abrirArea } from "./riel";
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
    if (conceder && info.project.name !== "telefono") await abrirArea(nav, "Personas");
    const personas = nav.getByRole("link", { name: "Personas", exact: true });
    if (conceder) await expect(personas.first()).toBeVisible();
    else await expect(personas).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`permisos-${conceder}.png`), fullPage: true });
  });
}

for (const conceder of [false, true]) {
  test(`Supervisor limitado ${conceder ? "con permiso" : "sin permiso"} no accede a persona fuera de alcance`, async ({
    page,
  }) => {
    await entrar(page, `supervisor-nav-${conceder ? "concede" : "deniega"}@opai.cl`);
    await page.goto("/supervisor/personas/00000000-0000-7000-8000-000000000078");
    await expect(
      page.getByRole("heading", { name: "No encontrado · Portal Supervisor" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Subir documento" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pedir" })).toHaveCount(0);
    await page.goto("/supervisor/personas/00000000-0000-7000-8000-000000000079");
    await expect(
      page.getByRole("heading", { name: "No encontrado · Portal Supervisor" }),
    ).toBeVisible();
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
