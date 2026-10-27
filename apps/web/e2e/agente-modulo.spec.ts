import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

test("el agente interno se ofrece como módulo sin activar una pantalla de chat", async ({
  page,
}, info) => {
  await entrar(page);
  await page.goto("/configuracion/modulos");
  await expect(page.getByText("Agente interno", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agente interno", exact: true })).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/opencode/agente-modulo-${info.project.name}.png`,
    fullPage: true,
  });
});
