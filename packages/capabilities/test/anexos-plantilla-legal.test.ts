// CAR-58: texto legal aprobado, marcadores {{campo}} y condicional {{#fecha_termino}}.
import { describe, expect, it } from "vitest";

import {
  PLANTILLA_ANEXO,
  TEXTO_LEGAL_ANEXO_APROBADO,
  aplicarCondicionalFechaTermino,
  rellenarTextoLegalAnexo,
} from "../src/core/anexos/plantilla";

describe("plantilla legal del anexo (CAR-58)", () => {
  it("la plantilla del repositorio ya no es de ejemplo", () => {
    expect(PLANTILLA_ANEXO.esEjemplo).toBe(false);
    expect(TEXTO_LEGAL_ANEXO_APROBADO).toContain("ANEXO DE CONTRATO DE TRABAJO");
    expect(TEXTO_LEGAL_ANEXO_APROBADO).toMatch(/\{\{#fecha_termino\}\}/);
  });

  it("oculta el bloque de fecha término sin quitarlo del texto fuente", () => {
    const bloqueado = aplicarCondicionalFechaTermino(TEXTO_LEGAL_ANEXO_APROBADO, null);
    expect(bloqueado).not.toMatch(/\{\{#fecha_termino\}\}/);
    expect(TEXTO_LEGAL_ANEXO_APROBADO).toMatch(/\{\{#fecha_termino\}\}/);
    const conFecha = aplicarCondicionalFechaTermino(TEXTO_LEGAL_ANEXO_APROBADO, "31-12-2026");
    expect(conFecha).toContain("31-12-2026");
    expect(conFecha).not.toContain("{{fecha_termino}}");
  });

  it("rellena los marcadores y reporta faltantes", () => {
    const r = rellenarTextoLegalAnexo("En {{ciudad_firma}}, {{trabajador_nombre}}.", {
      ciudad_firma: "Santiago",
      trabajador_nombre: "Ana Pérez",
    });
    expect(r.texto).toBe("En Santiago, Ana Pérez.");
    expect(r.faltantes).toEqual([]);
    expect(rellenarTextoLegalAnexo("RUT {{empresa_rut}}", {}).faltantes).toEqual(["empresa_rut"]);
  });
});