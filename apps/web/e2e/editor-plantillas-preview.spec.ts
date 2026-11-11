import { expect, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Editor de plantillas (CAR-127, CAR-315) en `preview-e2e`: un solo acceso a las variables por tamaño
// de pantalla y la explicación de los niveles de firma, a 375, 1024 y 1280 px. La plantilla es de prueba
// y se crea en la base de la vista previa con el usuario de `qa-e2e`.
test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("@preview editor de plantillas", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("variables sin accesos repetidos y niveles de firma explicados", async ({ page }, info) => {
    await entrar(page);
    // «Nueva plantilla» solo existe desde 768 px (en el teléfono la plantilla es de solo lectura): se crea
    // con la pantalla ancha y después se vuelve al tamaño de la prueba para revisar y capturar el editor.
    const tamano = page.viewportSize() ?? { width: 1280, height: 860 };
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/documentos/plantillas");
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    const nueva = page.getByRole("button", { name: "Nueva plantilla" }).filter({ visible: true }).first();
    await hidratado(nueva);
    await nueva.click();
    const dialogo = page.getByRole("dialog", { name: "Nueva plantilla" });
    await dialogo.getByLabel("Nombre").fill(`Plantilla de prueba ${info.project.name} ${Date.now()}`);
    await dialogo.getByRole("button", { name: "Crear y editar" }).click();
    await page.waitForURL(/\/documentos\/plantillas\/[0-9a-f-]{36}$/);
    await page.setViewportSize(tamano);
    await page.reload();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);

    const insertar = page.getByRole("button", { name: "Insertar variable" });
    if (info.project.name === "telefono") {
      await expect(page.getByText("Edita en un computador")).toBeVisible();
    } else {
      await expect(page.getByText("N1 · Simple.")).toBeVisible();
      await expect(page.getByText("N2 · Con verificación.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Ver variables" })).toHaveCount(0);
      // 1280: el panel está a la vista y el botón de la barra no aparece; 1024: solo el botón.
      if (info.project.name === "desktop") await expect(insertar).toBeHidden();
      else await expect(insertar).toBeVisible();
    }
    await capturar(page, info, "editor-plantillas");
  });
});
