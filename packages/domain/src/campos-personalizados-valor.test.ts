import { describe, expect, it } from "vitest";

import type { TipoCampoPersonalizado } from "./campos-personalizados";
import { validarValorCampo, type CampoValidable } from "./campos-personalizados-valor";

const OPCIONES = ["min", "ret", "ban"];
const campo = (tipo: TipoCampoPersonalizado, extra: Partial<CampoValidable> = {}): CampoValidable => ({
  tipo,
  opciones: OPCIONES,
  formato: null,
  ...extra,
});
const v = (tipo: TipoCampoPersonalizado, valor: unknown, extra?: Partial<CampoValidable>) =>
  validarValorCampo(campo(tipo, extra), valor);
const valido = (r: ReturnType<typeof v>) => (r.ok ? r.valor : `error: ${r.error}`);

describe("campos personalizados · valor por tipo", () => {
  it("vacío, null o lista vacía borran el valor", () => {
    expect(valido(v("texto", "  "))).toBeNull();
    expect(valido(v("numero", null))).toBeNull();
    expect(valido(v("multiple", []))).toBeNull();
  });
  it("texto de una línea y multilínea con tope", () => {
    expect(valido(v("texto", " Seguridad "))).toBe("Seguridad");
    expect(v("texto", "x".repeat(501)).ok).toBe(false);
    expect(v("texto", 3).ok).toBe(false);
    expect(valido(v("texto_largo", "a\nb"))).toBe("a\nb");
    expect(v("texto_largo", "x".repeat(5001)).ok).toBe(false);
  });
  it("número según formato", () => {
    expect(valido(v("numero", "12,5"))).toBe(12.5);
    expect(v("numero", "abc").ok).toBe(false);
    expect(v("numero", 1.5, { formato: "entero" }).ok).toBe(false);
    expect(v("numero", 1.5, { formato: "moneda_clp" }).ok).toBe(false);
    expect(valido(v("numero", "1500", { formato: "moneda_clp" }))).toBe(1500);
    expect(valido(v("numero", 12.5, { formato: "porcentaje" }))).toBe(12.5);
  });
  it("fecha real y fecha y hora ISO", () => {
    expect(valido(v("fecha", "2026-11-13"))).toBe("2026-11-13");
    expect(v("fecha", "2026-02-30").ok).toBe(false);
    expect(valido(v("fecha_hora", "2026-11-13T10:30:00-03:00"))).toBe("2026-11-13T13:30:00.000Z");
    expect(v("fecha_hora", "2026-11-13").ok).toBe(false);
  });
  it("sí/no solo booleano", () => {
    expect(valido(v("si_no", true))).toBe(true);
    expect(v("si_no", "si").ok).toBe(false);
  });
  it("desplegable y radio solo con valores internos de sus opciones", () => {
    expect(valido(v("lista", "ret"))).toBe("ret");
    expect(v("radio", "Retail").ok).toBe(false);
  });
  it("casillas múltiples: opciones del campo, sin repetir y en su orden", () => {
    expect(valido(v("multiple", ["ban", "min", "ban"]))).toEqual(["min", "ban"]);
    expect(v("multiple", ["otra"]).ok).toBe(false);
    expect(v("multiple", "min").ok).toBe(false);
  });
  it("email, teléfono y URL", () => {
    expect(valido(v("email", " Ana@Ejemplo.CL "))).toBe("ana@ejemplo.cl");
    expect(v("email", "ana@").ok).toBe(false);
    expect(valido(v("telefono", "9 8765 4321"))).toBe("+56987654321");
    expect(valido(v("telefono", "+1 (415) 555-0100"))).toBe("+14155550100");
    expect(v("telefono", "123").ok).toBe(false);
    expect(valido(v("url", "ejemplo.cl/x"))).toBe("https://ejemplo.cl/x");
    expect(v("url", "javascript:alert(1)").ok).toBe(false);
    expect(v("url", "localhost").ok).toBe(false);
  });
  it("RUT con dígito verificador, en forma canónica", () => {
    expect(valido(v("rut", "11.111.111-1"))).toBe("11111111-1");
    expect(v("rut", "11.111.111-2").ok).toBe(false);
  });
  it("usuario: un id con forma de UUID (la membresía la verifica la capacidad)", () => {
    expect(valido(v("usuario", "0193F2A0-0000-7000-8000-000000000001"))).toBe(
      "0193f2a0-0000-7000-8000-000000000001",
    );
    expect(v("usuario", "ana").ok).toBe(false);
  });
});
