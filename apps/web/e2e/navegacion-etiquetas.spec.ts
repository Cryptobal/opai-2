import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { entrar } from "./sesion";

async function comprobarPalabras(nav: Locator) {
  const etiquetas = nav.locator("a > span:last-child");
  expect(await etiquetas.count()).toBeGreaterThan(0);
  // Una sola evaluación sobre todas las etiquetas: con `all()` + `evaluate` una etiqueta que se re-renderiza
  // entre medias dejaba la espera colgada 90 s.
  const resultados = await etiquetas.evaluateAll((elementos) =>
    elementos.map((elemento) => {
      const texto = elemento.firstChild;
      if (!texto || texto.nodeType !== Node.TEXT_NODE) return null;
      const palabras = [...(texto.textContent ?? "").matchAll(/\S+/g)];
      return palabras.map((palabra) => {
        const rango = document.createRange();
        rango.setStart(texto, palabra.index);
        rango.setEnd(texto, palabra.index + palabra[0].length);
        const rects = [...rango.getClientRects()];
        const limites = elemento.getBoundingClientRect();
        const estilo = getComputedStyle(elemento);
        const corteSilabico =
          estilo.hyphens === "auto" &&
          elemento.getAttribute("lang") === "es" &&
          estilo.wordBreak === "normal" &&
          estilo.overflowWrap === "normal";
        return (
          rects.length > 0 &&
          (rects.length === 1 || corteSilabico) &&
          rects.every(
            (rect) => rect.left >= limites.left - 0.5 && rect.right <= limites.right + 0.5,
          )
        );
      });
    }),
  );
  for (const resultado of resultados) {
    expect(resultado).not.toBeNull();
    expect(resultado).not.toContain(false);
  }
}

test("etiquetas completas en riel y barra", async ({ page }, info) => {
  test.skip(info.project.name !== "telefono", "Los dos anchos se prueban en este proyecto");
  await entrar(page);
  await page.goto("/mi-cuenta/preferencias");
  await page.getByRole("radio", { name: /^Personas/ }).click();
  await expect(page.getByRole("radio", { name: /^Personas/ })).toHaveAttribute(
    "data-state",
    "checked",
  );
  const nav = page
    .getByRole("navigation", { name: "Principal", exact: true })
    .filter({ visible: true });
  const cargo = nav.getByRole("link", { name: "Personas", exact: true });
  await expect(cargo).toContainText("Personas");
  await expect
    .poll(() =>
      cargo
        .locator("span")
        .last()
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    )
    .toBe(true);
  await comprobarPalabras(nav);
  await page.getByRole("radio", { name: /^Según mi rol/ }).click();
  await page.setViewportSize({ width: 768, height: 900 });
  for (const nombre of ["Instalaciones", "Configuración"]) {
    const enlace = nav.getByRole("link", { name: nombre, exact: true });
    await expect(enlace).toContainText(nombre);
    await expect
      .poll(() =>
        enlace
          .locator("span")
          .last()
          .evaluate((e) => e.scrollWidth <= e.clientWidth),
      )
      .toBe(true);
  }
  await comprobarPalabras(nav);
});
