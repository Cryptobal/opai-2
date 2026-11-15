import { describe, expect, it } from "vitest";

import {
  erroresDePropio,
  evaluarPropio,
  unidadDePropio,
  type HechoDeclarado,
  type Ocurrencia,
} from "./propios";

const hecho = (id: string, extra: Partial<HechoDeclarado> = {}): HechoDeclarado => ({
  id,
  sujeto: "usuario",
  entidad: "negocio",
  montos: [],
  atributos: [],
  ...extra,
});
const hechos = new Map(
  [
    hecho("comercial.negocio_ganado", {
      montos: [{ id: "valor_mensual", unidad: "clp" }],
      atributos: [{ id: "con_cotizacion", valores: ["si", "no"] }],
    }),
    hecho("comercial.negocio_perdido"),
    hecho("comercial.solicitud_recibida", { entidad: "solicitud" }),
    hecho("comercial.solicitud_atendida", { entidad: "solicitud" }),
    hecho("personas.ingreso", { sujeto: "persona", entidad: "persona" }),
  ].map((h) => [h.id, h]),
);
const o = (sujetoId: string | null, en: string, clave: string, extra: Partial<Ocurrencia> = {}): Ocurrencia => ({
  sujetoId,
  en: new Date(en),
  clave,
  ...extra,
});
const ganados = [
  o("ana", "2026-10-05T12:00:00Z", "n1", { montos: { valor_mensual: 1_000_000 }, atributos: { con_cotizacion: "si" } }),
  o("ana", "2026-10-09T12:00:00Z", "n2", { montos: { valor_mensual: 500_000 }, atributos: { con_cotizacion: "no" } }),
  o("bea", "2026-10-11T12:00:00Z", "n3", { montos: { valor_mensual: 300_000 }, atributos: { con_cotizacion: "si" } }),
  o(null, "2026-10-12T12:00:00Z", "n4", { montos: { valor_mensual: 9 } }),
];

describe("validación de un indicador propio", () => {
  it("acepta las cuatro formas sobre hechos declarados y da su unidad", () => {
    const sumar = { forma: "sumar", hecho: "comercial.negocio_ganado", monto: "valor_mensual" } as const;
    expect(erroresDePropio(sumar, hechos)).toEqual([]);
    expect(unidadDePropio(sumar, hechos)).toBe("clp");
    expect(unidadDePropio({ forma: "contar", hecho: "comercial.negocio_ganado" }, hechos)).toBe("cantidad");
  });
  it("rechaza hechos, montos, filtros o combinaciones que no existen", () => {
    const err = (def: Parameters<typeof erroresDePropio>[0]) => erroresDePropio(def, hechos)[0];
    expect(err({ forma: "contar", hecho: "no.existe" })).toMatch(/no es un hecho disponible/);
    expect(err({ forma: "sumar", hecho: "comercial.negocio_perdido", monto: "valor_mensual" })).toMatch(/monto/);
    expect(
      err({ forma: "contar", hecho: "comercial.negocio_ganado", filtros: { con_cotizacion: ["quizas"] } }),
    ).toMatch(/valor que no existe/);
    expect(err({ forma: "contar", hecho: "comercial.negocio_perdido", filtros: { otro: ["x"] } })).toMatch(
      /no se puede filtrar/,
    );
    expect(
      err({
        forma: "tiempo",
        desde: { hecho: "comercial.solicitud_recibida" },
        hasta: { hecho: "comercial.negocio_ganado" },
        unidad: "horas",
      }),
    ).toMatch(/misma entidad/);
    const mismo = { hecho: "comercial.solicitud_atendida" };
    expect(err({ forma: "tiempo", desde: mismo, hasta: mismo, unidad: "horas" })).toMatch(/distintos/);
    expect(
      err({
        forma: "porcentaje",
        parte: { hecho: "personas.ingreso" },
        total: { hecho: "comercial.negocio_ganado" },
      }),
    ).toMatch(/sujetos distintos/);
  });
});

describe("evaluación", () => {
  const datos = new Map<string, Ocurrencia[]>([["comercial.negocio_ganado", ganados]]);
  it("contar y sumar, con filtro, sin atribuir lo que no tiene sujeto", () => {
    const contar = evaluarPropio({ forma: "contar", hecho: "comercial.negocio_ganado" }, datos);
    expect([...contar]).toEqual([["ana", 2], ["bea", 1]]);
    const sumar = evaluarPropio(
      { forma: "sumar", hecho: "comercial.negocio_ganado", monto: "valor_mensual", filtros: { con_cotizacion: ["si"] } },
      datos,
    );
    expect([...sumar]).toEqual([["ana", 1_000_000], ["bea", 300_000]]);
  });
  it("porcentaje de un hecho sobre otro; sin base no hay fila", () => {
    const def = {
      forma: "porcentaje",
      parte: { hecho: "comercial.negocio_ganado", filtros: { con_cotizacion: ["si"] } },
      total: { hecho: "comercial.negocio_ganado" },
    } as const;
    expect([...evaluarPropio(def, datos)]).toEqual([["ana", 50], ["bea", 100]]);
    expect([...evaluarPropio(def, new Map())]).toEqual([]);
  });
  it("tiempo entre dos hechos de la misma entidad, atribuido a quien la cierra", () => {
    const def = {
      forma: "tiempo",
      desde: { hecho: "comercial.solicitud_recibida" },
      hasta: { hecho: "comercial.solicitud_atendida" },
      unidad: "horas",
    } as const;
    const r = evaluarPropio(
      def,
      new Map([
        ["comercial.solicitud_recibida", [o(null, "2026-09-30T10:00:00Z", "s1"), o(null, "2026-10-02T10:00:00Z", "s2")]],
        [
          "comercial.solicitud_atendida",
          [
            o("ana", "2026-10-01T10:00:00Z", "s1"),
            o("ana", "2026-10-02T16:00:00Z", "s2"),
            // Sin inicio conocido: no se puede medir, queda fuera.
            o("bea", "2026-10-03T10:00:00Z", "s9"),
          ],
        ],
      ]),
    );
    expect([...r]).toEqual([["ana", 15]]);
    expect(evaluarPropio({ ...def, unidad: "dias" }, new Map()).size).toBe(0);
  });
});
