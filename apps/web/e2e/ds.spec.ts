import { expect, test } from "@playwright/test";

// Evidencia visual del Brief 00: capturas de /ds a 375 y 1024 en e2e/__screenshots__/.
test("la página /ds muestra el shell y los patrones", async ({ page }, info) => {
  await page.goto("/ds");
  await expect(page.getByRole("heading", { name: "Personas", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Principal" }).first()).toBeVisible();
  await page.screenshot({
    path: `e2e/__screenshots__/ds-${info.project.name}.png`,
    fullPage: true,
  });
});
