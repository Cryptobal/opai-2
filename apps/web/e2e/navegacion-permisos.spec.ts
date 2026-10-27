import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
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
    if (conceder && info.project.name !== "telefono") {
      const area = nav.getByRole("button", { name: "Personas", exact: true });
      if ((await area.count()) && (await area.getAttribute("aria-expanded")) !== "true")
        await area.click();
    }
    const personas = nav.getByRole("link", { name: "Personas", exact: true });
    if (conceder) await expect(personas.first()).toBeVisible();
    else await expect(personas).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`permisos-${conceder}.png`), fullPage: true });
  });
}
