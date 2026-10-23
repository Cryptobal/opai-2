import { describe, expect, it } from "vitest";

import { ErrorPlantilla, renderizar, variablesUsadas } from "./plantillas";

const DECLARADAS = ["persona.nombre", "documento.tipo", "documento.vence_en"];

describe("plantillas", () => {
  it("lista variables y renderiza valores anidados", () => {
    const t = "Hola {{ persona.nombre }}: tu {{documento.tipo}} vence el {{documento.vence_en}}.";
    expect(variablesUsadas(t)).toEqual(DECLARADAS);
    expect(
      renderizar(
        t,
        { persona: { nombre: "María" }, documento: { tipo: "OS-10", vence_en: "14-11-2026" } },
        DECLARADAS,
      ),
    ).toBe("Hola María: tu OS-10 vence el 14-11-2026.");
  });
  it("escapa HTML en correos y deja vacíos los ausentes", () => {
    expect(
      renderizar("<p>{{persona.nombre}}</p>", { persona: { nombre: "<b>x</b>" } }, DECLARADAS, {
        html: true,
      }),
    ).toBe("<p>&lt;b&gt;x&lt;/b&gt;</p>");
    expect(renderizar("[{{persona.nombre}}]", {}, DECLARADAS)).toBe("[]");
  });
  it("rechaza variables no declaradas", () => {
    expect(() => renderizar("{{persona.rut}}", {}, DECLARADAS)).toThrow(ErrorPlantilla);
  });
});
