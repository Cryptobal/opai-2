import { expect, test } from "@playwright/test";

// Evidencia visual del DS 2.0: capturas de /ds a 375 y 1024 en e2e/__screenshots__/.
test("la página /ds muestra el shell y los patrones", async ({ page }, info) => {
  await page.goto("/ds");
  await expect(page.getByRole("heading", { name: "ListScreen · Personas" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Principal" }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Cambiar de portal" }).first()).toBeAttached();
  await page.screenshot({ path: `e2e/__screenshots__/ds-${info.project.name}.png`, fullPage: true });
});
