import { describe, expect, it } from "vitest";

import {
  generarTokenFormulario,
  origenPermitido,
  PREFIJO_TOKEN_FORMULARIO,
  rutaEndpointFormulario,
  sufijoToken,
  textoOriginalDesdeFormulario,
} from "@opai/domain";

describe("formulario web · dominio", () => {
  it("genera tokens con prefijo opai_frm_", () => {
    const t = generarTokenFormulario();
    expect(t.startsWith(PREFIJO_TOKEN_FORMULARIO)).toBe(true);
    expect(sufijoToken(t)).toHaveLength(4);
  });

  it("valida dominio autorizado contra Origin o Referer", () => {
    expect(origenPermitido("gard.cl", "https://www.gard.cl", null)).toBe(true);
    expect(origenPermitido("gard.cl", "https://otro.cl", null)).toBe(false);
    expect(origenPermitido(null, "https://otro.cl", null)).toBe(true);
    expect(origenPermitido("gard.cl", null, null)).toBe(true);
  });

  it("arma el texto original con asunto opcional", () => {
    expect(textoOriginalDesdeFormulario({ mensaje: "Hola" })).toBe("Hola");
    expect(textoOriginalDesdeFormulario({ mensaje: "Cuerpo", asunto: "Cotizar" })).toContain(
      "Asunto: Cotizar",
    );
  });

  it("ruta del endpoint por slug", () => {
    expect(rutaEndpointFormulario("gard")).toBe("/api/t/gard/solicitudes");
  });
});
