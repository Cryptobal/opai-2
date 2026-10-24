import { expect, test } from "@playwright/test";

// Comportamiento de Checkbox y RadioGroup del DS en /ds: clic en la etiqueta, teclado, foco y
// opciones deshabilitadas. Protege el corte del JS de esas primitivas (ADR-037).
test.describe("Checkbox y RadioGroup del DS", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ds");
    // Los controles responden cuando la página terminó de hidratarse.
    await page.waitForLoadState("networkidle");
    await page.getByRole("radiogroup", { name: "Jornada" }).scrollIntoViewIfNeeded();
  });

  test("la casilla cambia con clic en la etiqueta y con Espacio, no con Enter", async ({
    page,
  }) => {
    const imponible = page.getByRole("checkbox", { name: "Imponible" });
    await expect(imponible).toBeChecked();
    await page.getByText("Imponible", { exact: true }).click();
    await expect(imponible).not.toBeChecked();

    await imponible.focus();
    await expect(imponible).toBeFocused();
    await page.keyboard.press("Space");
    await expect(imponible).toBeChecked();
    await page.keyboard.press("Enter");
    await expect(imponible).toBeChecked();

    await expect(page.getByRole("checkbox", { name: "Deshabilitado" })).toBeDisabled();
    await expect(page.getByRole("checkbox", { name: "Acepto la política" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("el grupo de radios se mueve con flechas y salta la opción deshabilitada", async ({
    page,
  }) => {
    const grupo = page.getByRole("radiogroup", { name: "Jornada" });
    const dia = grupo.getByRole("radio", { name: "Día" });
    await expect(dia).toBeChecked();

    // Radix marca la opción al recibir el foco mientras la flecha sigue presionada: se mantiene
    // 50 ms, como una pulsación real.
    const flecha = () => page.keyboard.press("ArrowDown", { delay: 50 });
    await dia.focus();
    await flecha();
    await expect(grupo.getByRole("radio", { name: "Noche" })).toBeChecked();
    await expect(grupo.getByRole("radio", { name: "Noche" })).toBeFocused();

    await flecha();
    await expect(grupo.getByRole("radio", { name: "Rotativa" })).toBeChecked();
    // Salta la opción deshabilitada y vuelve al inicio.
    await flecha();
    await expect(dia).toBeChecked();
    await expect(dia).toBeFocused();

    await grupo.getByText("Rotativa", { exact: true }).click();
    await expect(grupo.getByRole("radio", { name: "Rotativa" })).toBeChecked();
    await expect(grupo.getByRole("radio", { name: "Deshabilitado" })).toBeDisabled();
  });
});
