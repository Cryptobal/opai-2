import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Checkbox } from "./checkbox";
import { RadioGroup } from "./radio-group";

// Marcado del servidor de Checkbox y RadioGroup: rol, estado, etiqueta y nombre accesible. El
// teclado y el clic se prueban en /ds con Playwright (apps/web/e2e/ds-seleccion.spec.ts).
const nada = () => undefined;

describe("Checkbox", () => {
  it("es una casilla marcada con su etiqueta asociada", () => {
    const html = renderToStaticMarkup(
      createElement(Checkbox, { etiqueta: "Imponible", marcado: true, onCambiar: nada }),
    );
    expect(html).toMatch(/<button[^>]*role="checkbox"[^>]*aria-checked="true"/);
    expect(html).toMatch(/data-state="checked"/);
    const id = /<button[^>]*id="([^"]+)"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`for="${id}"`);
    expect(html).toContain(">Imponible<");
    expect(html).toContain("<svg");
  });

  it("sin marcar no pinta el indicador", () => {
    const html = renderToStaticMarkup(
      createElement(Checkbox, { etiqueta: "Tributable", marcado: false, onCambiar: nada }),
    );
    expect(html).toMatch(/aria-checked="false"/);
    expect(html).not.toContain("<svg");
  });

  it("solo control: la etiqueta pasa a ser el nombre accesible", () => {
    const html = renderToStaticMarkup(
      createElement(Checkbox, {
        etiqueta: "Seleccionar fila",
        marcado: false,
        onCambiar: nada,
        soloControl: true,
      }),
    );
    expect(html).toContain('aria-label="Seleccionar fila"');
    expect(html).not.toContain("<label");
  });

  it("deshabilitada y con error", () => {
    const html = renderToStaticMarkup(
      createElement(Checkbox, {
        etiqueta: "Acepto",
        marcado: false,
        onCambiar: nada,
        disabled: true,
        error: "Obligatorio",
      }),
    );
    expect(html).toMatch(/<button[^>]*disabled=""/);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(">Obligatorio<");
  });
});

describe("RadioGroup", () => {
  const opciones = [
    { valor: "dia", etiqueta: "Día" },
    { valor: "noche", etiqueta: "Noche", disabled: true },
  ] as const;

  it("es un grupo con nombre y marca la opción elegida", () => {
    const html = renderToStaticMarkup(
      createElement(RadioGroup, { etiqueta: "Jornada", valor: "dia", onCambiar: nada, opciones }),
    );
    expect(html).toMatch(
      /role="radiogroup"[^>]*aria-label="Jornada"|aria-label="Jornada"[^>]*role="radiogroup"/,
    );
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/<button[^>]*role="radio"[^>]*aria-checked="true"[^>]*>/);
    expect(html).toMatch(/<button[^>]*role="radio"[^>]*aria-checked="false"[^>]*disabled=""/);
    const id = /<button[^>]*id="([^"]+-dia)"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`for="${id}"`);
  });
});
