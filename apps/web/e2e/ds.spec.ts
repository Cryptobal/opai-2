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

test.describe("QA pasada 2 · sin desborde horizontal", () => {
  test("el formulario con dirección larga cabe en el ancho de la pantalla", async ({ page }) => {
    await page.goto("/ds/qa");
    const form = page.getByTestId("formulario-qa");
    await form.scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      ventana: document.documentElement.clientWidth,
    }));
    expect(m.pagina, "la página no debe tener scroll horizontal").toBeLessThanOrEqual(m.ventana);
    const derecha = await form
      .locator("input, button")
      .evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
    expect(derecha).toBeLessThanOrEqual(m.ventana);
  });

  test("chips y botones primarios miden al menos 44 px en teléfono", async ({ page }, info) => {
    test.skip(info.project.name !== "telefono", "el mínimo táctil aplica al teléfono");
    await page.goto("/ds/qa");
    const alto = await page
      .getByTestId("chips-qa")
      .getByRole("button")
      .first()
      .evaluate((e) => e.getBoundingClientRect().height);
    expect(alto).toBeGreaterThanOrEqual(44);
  });
});

test.describe("Pestañas · sin desplazamiento vertical", () => {
  test("la barra de pestañas solo se desplaza en horizontal", async ({ page }) => {
    await page.goto("/ds");
    const barra = page.getByRole("navigation", { name: "Secciones" }).first();
    await barra.scrollIntoViewIfNeeded();
    const m = await barra.evaluate((el) => ({
      scroll: el.scrollHeight,
      alto: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(m.scroll, "scrollHeight debe ser igual a clientHeight").toBe(m.alto);
    expect(m.overflowY).toBe("hidden");
  });
});

test.describe("QA pasada 5 · calendario sobre una hoja", () => {
  test("en teléfono el calendario oscurece también la hoja de abajo", async ({ page }, info) => {
    test.skip(info.project.name !== "telefono", "la hoja inferior del calendario es de teléfono");
    await page.goto("/ds/qa");
    await page.getByRole("button", { name: "Abrir hoja con fecha" }).click();
    const hoja = page.getByRole("dialog", { name: "Agregar persona" });
    await hoja.getByRole("button", { name: "Abrir calendario" }).click();
    await expect(page.getByRole("dialog", { name: "Elegir fecha" })).toBeVisible();
    // Radix oculta la hoja de abajo del árbol de accesibilidad: se mide por DOM.
    const z = await page.evaluate(() => {
      const nivel = (el: Element) => Number(getComputedStyle(el).zIndex);
      const paneles = [...document.querySelectorAll('[role="dialog"]')];
      const abajo = paneles.find((d) => d.textContent?.includes("Agregar persona"));
      const arriba = paneles.find((d) => d.textContent?.includes("Elegir fecha"));
      const fondos = [...document.querySelectorAll('[data-state="open"].bg-scrim')];
      return {
        abajo: abajo ? nivel(abajo) : NaN,
        arriba: arriba ? nivel(arriba) : NaN,
        fondoSuperior: Math.max(...fondos.map(nivel)),
      };
    });
    expect(z.fondoSuperior, "el fondo del calendario va sobre la hoja de abajo").toBeGreaterThan(
      z.abajo,
    );
    expect(z.arriba, "el calendario va sobre su propio fondo").toBeGreaterThan(z.fondoSuperior);
  });
});
