import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Control, type CampoAjusteVista } from "./ajustes-control";

const campo: CampoAjusteVista = {
  modulo: "qa", clave: "ficticio", etiqueta: "Avisos ficticios", ayuda: null, grupo: null,
  ambito: "tenant", control: "texto", editable: true, esquema: { type: "string" },
};
async function render(control: string, valor: unknown, editable = true) {
  const stream = await renderToReadableStream(createElement(Control, {
    campo: { ...campo, control, editable }, valor, origen: "tenant", modificado: false,
    onCambiar: () => undefined, id: "qa-control",
  }));
  await stream.allReady;
  return new Response(stream).text();
}

describe("Ajustes: controles diferidos conservan contrato", () => {
  it("texto permanece disponible con valor y etiqueta html", async () => {
    const html = await render("texto", "qa@example.test");
    expect(html).toContain('id="qa-control"');
    expect(html).toContain('value="qa@example.test"');
    expect(html).not.toContain('role="switch"');
  });
  it.each([true, false])("switch diferido conserva checked=%s", async (checked) => {
    const html = await render("switch", checked);
    expect(html).toContain('role="switch"');
    expect(html).toContain(`aria-checked="${checked}"`);
    expect(html).toContain('aria-label="Avisos ficticios"');
  });
  it("switch no editable sigue deshabilitado", async () => {
    expect(await render("switch", false, false)).toContain("disabled");
  });
});
