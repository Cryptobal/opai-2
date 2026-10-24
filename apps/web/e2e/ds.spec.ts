import { expect, test } from "@playwright/test";

// Evidencia visual del DS 2.0: capturas de /ds a 375 y 1024 en e2e/__screenshots__/.
test("la página /ds muestra el shell y los patrones", async ({ page }, info) => {
  await page.goto("/ds");
  await expect(page.getByRole("heading", { name: "ListScreen · Personas" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Principal" }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Cambiar de portal" }).first()).toBeAttached();
  await page.screenshot({
    path: `e2e/__screenshots__/ds-${info.project.name}.png`,
    fullPage: true,
  });
});

test.describe("QA pasada 1", () => {
  test("una dirección larga cabe en el panel angosto sin desbordar", async ({ page }) => {
    await page.goto("/ds/qa");
    const panel = page.getByTestId("panel-angosto");
    await panel.scrollIntoViewIfNeeded();
    const medidas = await panel.evaluate((el) => ({
      ancho: el.clientWidth,
      scroll: el.scrollWidth,
      izquierda: el.getBoundingClientRect().left,
    }));
    expect(medidas.scroll).toBeLessThanOrEqual(medidas.ancho);
    expect(medidas.izquierda).toBeGreaterThanOrEqual(0);
  });

  test("la fecha se escribe y se ve como dd-mm-aaaa", async ({ page }) => {
    await page.goto("/ds/qa");
    const campo = page.getByLabel("Vigencia desde (dd-mm-aaaa)");
    await expect(campo).toHaveValue("23-10-2026");
    await campo.fill("");
    await campo.pressSequentially("01022027");
    await expect(campo).toHaveValue("01-02-2027");
  });

  test("los chips activos se distinguen de los inactivos", async ({ page }) => {
    await page.goto("/ds/qa");
    const chips = page.getByTestId("chips-qa");
    await expect(chips.getByRole("button", { name: /Vencidos/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(chips.getByRole("button", { name: /Faltan/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
