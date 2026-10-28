import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
test.setTimeout(180_000);

test("Empresas tiene un solo título visible y conserva Nueva", async ({ page }, info) => {
  if (!password) throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  await entrar(page);
  await page.goto("/platform");
  await expect(
    page.getByRole("heading", { name: "Empresas", exact: true }).filter({ visible: true }),
  ).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Nueva", exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/nucleo-seguimiento-${info.project.name}.png`,
    fullPage: true,
  });
});

test("Trabajador vuelve al ERP con título y Supervisor activa solo Instalaciones", async ({
  page,
}) => {
  if (!password) throw new Error("Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  await entrar(page);
  await page.goto("/trabajador");
  const selector = page.getByRole("button", { name: /Cambiar de portal o empresa/ });
  const erp = page.getByRole("menuitem", { name: /^ERP/ });
  // En dev el control puede mostrarse antes de hidratarse; reintentar hasta abrir el menú.
  await expect(async () => {
    if (!(await erp.isVisible())) await selector.click();
    await expect(erp).toBeVisible({ timeout: 1000 });
  }).toPass();
  await erp.click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.locator("header h1")).toHaveText("Inicio");
  await page.goto("/supervisor/instalaciones");
  await expect(page.getByRole("link", { name: "Hoy", exact: true }).first()).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: /Instalac/ }).first()).toHaveAttribute(
    "aria-current",
    "page",
  );
});
