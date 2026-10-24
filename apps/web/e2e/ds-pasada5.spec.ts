import { expect, test } from "@playwright/test";

// QA pasada 5 (24-oct): calendario sobre una hoja y campos con id o name.
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
      const fondo = [...document.querySelectorAll('[data-state="open"].bg-scrim')].at(-1);
      return {
        abajo: abajo ? nivel(abajo) : NaN,
        arriba: arriba ? nivel(arriba) : NaN,
        fondo: fondo ? nivel(fondo) : NaN,
        // Con el mismo z-index manda el orden en el DOM: el fondo nuevo va después de la hoja de abajo.
        despues: !!(
          abajo &&
          fondo &&
          abajo.compareDocumentPosition(fondo) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
      };
    });
    expect(
      z.fondo,
      "el fondo del calendario no queda bajo la hoja de abajo",
    ).toBeGreaterThanOrEqual(z.abajo);
    expect(z.despues, "y se pinta después de ella").toBe(true);
    expect(z.arriba, "el calendario va sobre su propio fondo").toBeGreaterThanOrEqual(z.fondo);
  });
});

test.describe("QA pasada 5 · campos con id o name", () => {
  // Se excluyen las entradas ocultas de Radix (aria-hidden): solo existen dentro de un <form>.
  const sinIdNiName = () =>
    [...document.querySelectorAll("input, select, textarea")]
      .filter(
        (e) => !e.id && !(e as HTMLInputElement).name && e.getAttribute("aria-hidden") !== "true",
      )
      .map(
        (e) =>
          `${e.tagName.toLowerCase()}[${e.getAttribute("aria-label") ?? e.getAttribute("placeholder") ?? ""}]`,
      );

  test("ningún campo queda sin id ni name (aviso de DevTools)", async ({ page }, info) => {
    await page.goto("/ds/qa");
    expect(await page.evaluate(sinIdNiName), "página en reposo").toEqual([]);
    await expect(async () => {
      await page.getByRole("button", { name: "Abrir calendario" }).first().click();
      await expect(page.getByRole("button", { name: "Hoy" })).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15_000 });
    expect(await page.evaluate(sinIdNiName), "con el calendario abierto").toEqual([]);
    if (info.project.name === "telefono") return;
    await page.goto("/ds");
    expect(await page.evaluate(sinIdNiName), "/ds").toEqual([]);
  });

  test("dos direcciones sin id no repiten ids y cada error es el suyo", async ({ page }) => {
    await page.goto("/ds/qa");
    const bloque = page.getByTestId("direcciones-sin-id");
    await bloque.scrollIntoViewIfNeeded();
    const errores = await bloque.evaluate((el) =>
      [...el.querySelectorAll("[aria-describedby]")].map((c) => {
        const id = c.getAttribute("aria-describedby") ?? "";
        return { id, texto: document.getElementById(id)?.textContent ?? null };
      }),
    );
    expect(errores.map((e) => e.texto)).toEqual(["Error de la primera", "Error de la segunda"]);
    expect(new Set(errores.map((e) => e.id)).size, "ids de error distintos").toBe(2);
    // A mano: dos veces el primer botón, porque al pulsarlo desaparece.
    for (let i = 0; i < 2; i++) {
      await bloque.getByRole("button", { name: "Escribir a mano" }).first().click();
    }
    const ids = await bloque.evaluate((el) => [...el.querySelectorAll("[id]")].map((e) => e.id));
    expect(ids.length, "los campos a mano tienen id").toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size, "ids únicos").toBe(ids.length);
    expect(await page.evaluate(sinIdNiName), "con las direcciones a mano").toEqual([]);
  });
});
