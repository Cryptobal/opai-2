import { describe, expect, it } from "vitest";

import {
  definicionDesdeJson,
  primeraReglaQueCalza,
  reglaCalza,
  reglaConciliaSola,
  rutsEnTexto,
  type ReglaEvaluable,
} from "./reglas-banco";

const regla = (p: Partial<ReglaEvaluable>): ReglaEvaluable => ({
  id: "r1",
  nombre: "Regla",
  prioridad: 0,
  modo: "todas",
  activa: true,
  flujoFilaId: "fila-1",
  alcance: "ambos",
  condiciones: [],
  ...p,
});

describe("reglas del banco (CAR-328)", () => {
  it("reconoce RUT con y sin puntos, y no inventa RUT dentro de números largos", () => {
    expect(rutsEnTexto("Transf.Internet a 11.111.111-1")).toEqual(["11111111-1"]);
    expect(rutsEnTexto("ref 111111111")).toEqual(["11111111-1"]);
    expect(rutsEnTexto("0799324601 Transf. EMPRESA FICTICIA")).toEqual([]);
  });

  it("glosa contiene y empieza ignoran mayúsculas y tildes", () => {
    const r = regla({ condiciones: [{ campo: "glosa", operador: "contiene", valor: "compra resend" }] });
    expect(reglaCalza(r, { monto: -100, glosa: "Compra RESEND", referencia: null })).toBe(true);
    const e = regla({ condiciones: [{ campo: "glosa", operador: "empieza", valor: "pago en línea" }] });
    expect(reglaCalza(e, { monto: -5, glosa: "PAGO EN LINEA PREVIRED", referencia: null })).toBe(true);
    expect(reglaCalza(e, { monto: -5, glosa: "OTRO PAGO EN LINEA", referencia: null })).toBe(false);
  });

  it("respeta el alcance abonos/cargos y el modo todas/alguna", () => {
    const base = [{ campo: "glosa", operador: "contiene", valor: "ARRIENDO" } as const];
    expect(reglaCalza(regla({ alcance: "cargos", condiciones: [...base] }), { monto: 10, glosa: "ARRIENDO", referencia: null })).toBe(false);
    const alguna = regla({
      modo: "alguna",
      condiciones: [...base, { campo: "monto", operador: "exacto", valor: "999" }],
    });
    expect(reglaCalza(alguna, { monto: -999, glosa: "OTRO", referencia: null })).toBe(true);
    expect(reglaCalza({ ...alguna, modo: "todas" }, { monto: -999, glosa: "OTRO", referencia: null })).toBe(false);
  });

  it("monto entre usa el valor absoluto", () => {
    const r = regla({ condiciones: [{ campo: "monto", operador: "entre", valor: "1000", hasta: 2000 }] });
    expect(reglaCalza(r, { monto: -1500, glosa: "x", referencia: null })).toBe(true);
    expect(reglaCalza(r, { monto: 2500, glosa: "x", referencia: null })).toBe(false);
  });

  it("concilia sola solo con monto exacto y referencia igual (ADR-074)", () => {
    const exacta = regla({
      condiciones: [
        { campo: "monto", operador: "exacto", valor: "$ 20.174" },
        { campo: "referencia", operador: "igual", valor: "ABC-1" },
      ],
    });
    const mov = { monto: -20174, glosa: "Compra", referencia: "abc-1" };
    expect(reglaConciliaSola(exacta, mov)).toBe(true);
    expect(reglaConciliaSola({ ...exacta, flujoFilaId: null }, mov)).toBe(false);
    const soloGlosa = regla({ condiciones: [{ campo: "glosa", operador: "contiene", valor: "Compra" }] });
    expect(reglaCalza(soloGlosa, mov)).toBe(true);
    expect(reglaConciliaSola(soloGlosa, mov)).toBe(false);
  });

  it("toma la primera regla con destino por prioridad e ignora las inactivas", () => {
    const c = [{ campo: "glosa", operador: "contiene", valor: "PAGO" } as const];
    const reglas = [
      regla({ id: "baja", nombre: "B", prioridad: 1, condiciones: [...c] }),
      regla({ id: "alta", nombre: "A", prioridad: 9, condiciones: [...c], activa: false }),
      regla({ id: "media", nombre: "M", prioridad: 5, condiciones: [...c] }),
      regla({ id: "sin-destino", nombre: "S", prioridad: 7, condiciones: [...c], flujoFilaId: null }),
    ];
    expect(primeraReglaQueCalza(reglas, { monto: -1, glosa: "PAGO", referencia: null })?.id).toBe("media");
  });

  it("una regla sin condiciones o con JSON desconocido nunca calza", () => {
    expect(reglaCalza(regla({}), { monto: 1, glosa: "x", referencia: null })).toBe(false);
    expect(definicionDesdeJson({ rut: "1" })).toBeNull();
    expect(definicionDesdeJson({ alcance: "ambos", condiciones: [{ campo: "rut", operador: "contiene", valor: "1" }] })).toBeNull();
    expect(
      definicionDesdeJson({ alcance: "cargos", condiciones: [{ campo: "glosa", operador: "contiene", valor: "x" }] }),
    ).toEqual({ alcance: "cargos", condiciones: [{ campo: "glosa", operador: "contiene", valor: "x" }] });
  });
});
