import { expect, test } from "@playwright/test";

// QA pasada 5 (24-oct): calendario sobre una hoja, pestañas que no caben y campos con id.
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

test.describe("QA pasada 5 · pestañas que no caben", () => {
  test("la pestaña activa queda visible, hay degradado donde hay más y no hay scroll vertical", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "telefono", "las pestañas se cortan solo en teléfono");
    await page.goto("/ds/qa");
    const bloque = page.getByTestId("pestanas-qa");
    await bloque.scrollIntoViewIfNeeded();
    const barra = bloque.getByRole("tablist");
    const activa = barra.getByRole("tab", { selected: true });
    await expect(activa).toBeInViewport({ ratio: 1 });
    const m = await barra.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const a = el.querySelector('[aria-selected="true"]')?.getBoundingClientRect();
      return {
        alto: el.clientHeight,
        scroll: el.scrollHeight,
        izq: el.scrollLeft > 0,
        activaDentro: !!a && a.left >= r.left - 1 && a.right <= r.right + 1,
      };
    });
    expect(m.izq, "la barra se desplazó hasta la pestaña activa").toBe(true);
    expect(m.activaDentro, "la pestaña activa cabe entera en la barra").toBe(true);
    expect(m.scroll, "sin scroll vertical").toBe(m.alto);
    const pagina = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      ventana: document.documentElement.clientWidth,
    }));
    expect(pagina.ancho, "las pestañas no ensanchan la página").toBeLessThanOrEqual(pagina.ventana);
    await expect(barra).toHaveAttribute("data-izq", "true");
    await expect(barra).toHaveAttribute("data-der", "false");
    // Al volver al inicio aparece el degradado derecho y desaparece el izquierdo.
    await barra.evaluate((el) => el.scrollTo({ left: 0 }));
    await expect(barra).toHaveAttribute("data-der", "true");
    await expect(barra).toHaveAttribute("data-izq", "false");
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
});
