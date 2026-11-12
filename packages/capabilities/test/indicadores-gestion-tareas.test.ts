import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

// Indicador del núcleo «Tareas cumplidas a tiempo» (CAR-305, ADR-094) con contexto falso.
const ANA = "0192f3a0-0000-7000-8000-0000000000a1";
const BEA = "0192f3a0-0000-7000-8000-0000000000b2";
const MEDIR = "core.indicadores_gestion.medir";
const d = (iso: string) => new Date(iso);
type Salida = { mediciones: { sujetoId: string; valor: number | null; logro: number | null }[] };

const tarea = (id: string, estado: string, vence: string, hecha: string | null, tipo = "tarea") => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  tipo,
  estado,
  vencimiento: d(vence),
  completadaEn: hecha ? d(hecha) : null,
  todoElDia: false,
});
const semilla = {
  tenant: [{ id: TENANT_DE_PRUEBA, timezone: "America/Santiago" }],
  actividad: [
    tarea("t1", "hecha", "2026-11-10T15:00:00Z", "2026-11-10T14:00:00Z"),
    tarea("t2", "hecha", "2026-11-12T15:00:00Z", "2026-11-13T09:00:00Z"),
    tarea("t3", "pendiente", "2026-11-20T15:00:00Z", null),
    tarea("t4", "cancelada", "2026-11-21T15:00:00Z", null),
    // Fuera del mes en la zona de la empresa: 1-dic 02:00 UTC es todavía 30-nov en Santiago.
    tarea("t5", "hecha", "2026-12-01T02:00:00Z", "2026-12-01T01:00:00Z"),
    tarea("t6", "hecha", "2026-12-01T04:00:00Z", "2026-12-01T03:30:00Z"),
    tarea("n1", "hecha", "2026-11-10T15:00:00Z", "2026-11-10T14:00:00Z", "nota"),
  ],
  actividadResponsable: [
    ...["t1", "t2", "t3", "t4", "t5", "t6", "n1"].map((actividadId) => ({
      id: `r-${actividadId}`,
      tenantId: TENANT_DE_PRUEBA,
      actividadId,
      usuarioId: ANA,
    })),
    { id: "r-b1", tenantId: TENANT_DE_PRUEBA, actividadId: "t1", usuarioId: BEA },
  ],
  // t1 está ligada a un negocio: solo la mide quien puede ver negocios.
  actividadVinculo: [
    { id: "v1", tenantId: TENANT_DE_PRUEBA, actividadId: "t1", negocioId: "neg-1" },
    { id: "v2", tenantId: TENANT_DE_PRUEBA, actividadId: "t2", negocioId: null },
  ],
};
const noviembre = { indicador: "core.tareas_a_tiempo", periodo: "2026-11" };
const conComercial = { semilla, modulosActivos: ["comercial"] };

describe("core.tareas_a_tiempo", () => {
  beforeEach(() => {
    reiniciar();
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("al cierre del mes cuenta lo que vencía, sin canceladas, por cada responsable", async () => {
    vi.setSystemTime(d("2026-12-05T12:00:00Z"));
    const { ctx } = contextoDePrueba(conComercial);
    const r = await dato<Salida>(ctx, MEDIR, noviembre);
    // Ana: t1 y t5 a tiempo, t2 tarde y t3 sin hacer → 2 de 4. Bea: t1 → 1 de 1.
    expect(r.mediciones).toEqual([
      { sujetoId: ANA, valor: 50, logro: 0.5556 },
      { sujetoId: BEA, valor: 100, logro: 1.1111 },
    ]);
  });
  it("a mitad de mes una pendiente que aún tiene plazo no baja el resultado", async () => {
    vi.setSystemTime(d("2026-11-15T12:00:00Z"));
    const { ctx } = contextoDePrueba(conComercial);
    const r = await dato<Salida>(ctx, MEDIR, noviembre);
    // Ana: t1 y t5 a tiempo, t2 tarde; t3 vence el 20 y todavía no cuenta → 2 de 3.
    expect(r.mediciones.find((m) => m.sujetoId === ANA)?.valor).toBe(66.7);
  });
  it("quien no puede ver negocios no mide las tareas ligadas a un negocio", async () => {
    vi.setSystemTime(d("2026-12-05T12:00:00Z"));
    // Comercial apagado: t1 queda fuera. Ana: t5 a tiempo, t2 tarde, t3 sin hacer. Bea: sin tareas.
    const apagado = contextoDePrueba({ semilla }).ctx;
    expect((await dato<Salida>(apagado, MEDIR, noviembre)).mediciones).toEqual([
      { sujetoId: ANA, valor: 33.3, logro: 0.37 },
    ]);
    // Key acotada al núcleo, aunque Comercial esté activo: misma regla.
    const soloNucleo = contextoDePrueba({ ...conComercial, scopes: ["core"] }).ctx;
    const r = await dato<Salida>(soloNucleo, MEDIR, noviembre);
    expect(r.mediciones.map((m) => m.sujetoId)).toEqual([ANA]);
  });
  it("sin tareas en el mes no hay filas, y filtra por sujeto", async () => {
    vi.setSystemTime(d("2026-12-05T12:00:00Z"));
    const { ctx } = contextoDePrueba(conComercial);
    const vacio = await dato<Salida>(ctx, MEDIR, { ...noviembre, periodo: "2026-09" });
    expect(vacio.mediciones).toEqual([]);
    const soloBea = await dato<Salida>(ctx, MEDIR, { ...noviembre, sujetos: [BEA] });
    expect(soloBea.mediciones.map((m) => m.sujetoId)).toEqual([BEA]);
  });
});
