// Brief 27 (CAR-99): cálculo y lectura de liquidaciones. Permisos, dryRun, idempotencia, novedades,
// auditoría por IDs y período cerrado. El aislamiento entre tenants va en nomina-liquidaciones-db.test.ts.
import { beforeEach, describe, expect, it } from "vitest";

import { CLAVES_INDICADORES } from "@opai/domain";

import { publicacionesReferencia } from "../../domain/src/remuneraciones/referencia.fixture";
import {
  capacidadesDelNucleo,
  capacidadesNomina,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { TENANT_DE_PRUEBA as T, contextoDePrueba } from "../src/testing";
import { diasDelVinculo } from "../src/nomina/costo-proyectado-datos";
import { semillaTenant } from "./semilla";

const P1 = "0192f3a0-0000-7000-8000-00000000f401";
const P2 = "0192f3a0-0000-7000-8000-00000000f402";
const PER = "0192f3a0-0000-7000-8000-00000000f4a1";
const f = (s: string) => new Date(`${s}T00:00:00.000Z`);

const semilla = (estado = "abierto") => {
  const pubs = publicacionesReferencia();
  return {
    ...semillaTenant(),
    indicadorLegal: CLAVES_INDICADORES.map((clave) => ({ id: `i-${clave}`, clave })),
    valorPublicado: pubs.map((p, i) => ({
      id: `v-${i}`, indicadorId: `i-${p.indicador}`, estado: "vigente", vigenteDesde: f(p.vigenteDesde), vigenteHasta: null,
      valorJson: p.valor, fuente: p.fuente, consultadaEl: f("2026-11-01"), verificacion: "verificado",
    })),
    persona: [P1, P2].map((id, i) => ({ id, tenantId: T, nombres: "N", apellidos: `A${i}`, rut: `${i + 1}`, estado: "activa" })),
    vinculoLaboral: [P1, P2].map((personaId, i) => ({
      id: `0192f3a0-0000-7000-8000-00000000f41${i}`, tenantId: T, personaId, cargoId: "c", tipo: "indefinido",
      inicio: f("2025-01-01"), termino: null, estado: "vigente", puestoId: null, instalacionId: null, horasSemanales: 42,
    })),
    estructuraSueldo: [{
      id: "0192f3a0-0000-7000-8000-00000000f421", tenantId: T, nivel: "persona", personaId: P1, cargoId: null, puestoId: null,
      instalacionId: null, sueldoBase: 553_553, colacion: 0, movilizacion: 0, gratificacion: "legal_25", gratificacionMonto: null,
      vigenteDesde: f("2026-01-01"), vigenteHasta: null, estado: "vigente", motivo: "prueba", items: [],
    }],
    estructuraItem: [],
    nominaPeriodo: [{ id: PER, tenantId: T, anio: 2026, mes: 11, estado, inicio: f("2026-11-01"), fin: f("2026-11-30"), cierrePrevisto: f("2026-11-30") }],
    nominaNovedad: [
      { id: "n1", tenantId: T, periodoId: PER, personaId: P1, tipo: "licencia", estado: "vigente", fechaDesde: f("2026-11-03"), cantidad: 10, montoClp: null },
      { id: "n2", tenantId: T, periodoId: PER, personaId: P1, tipo: "anticipo", estado: "vigente", fechaDesde: f("2026-11-15"), cantidad: null, montoClp: 50_000 },
      { id: "n3", tenantId: T, periodoId: PER, personaId: P1, tipo: "descuento", estado: "anulada", fechaDesde: f("2026-11-15"), cantidad: null, montoClp: 9_999 },
    ],
    nominaLiquidacion: [],
  };
};
const como = (rol: "owner" | "gerente" = "owner", estado = "abierto", extra: Parameters<typeof contextoDePrueba>[0] = {}) =>
  contextoDePrueba({ rol, portal: "erp", modulosActivos: ["nomina"], semilla: semilla(estado), ...extra });
type Ctx = ReturnType<typeof como>;
const run = (c: Ctx, id: string, input: unknown, opts?: { dryRun?: boolean }) => executeCapability(c.ctx, id, input, opts);
const data = <T>(r: Awaited<ReturnType<typeof run>>) => {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data as T;
};

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
});

describe("nomina.liquidaciones", () => {
  it("calcula con las novedades vigentes y omite a quien no tiene capa", async () => {
    const c = como();
    const r = data<{ calculadas: number; omitidas: { personaId: string; motivo: string }[] }>(
      await run(c, "nomina.liquidaciones.calcular", { periodoId: PER }));
    expect(r.calculadas).toBe(1);
    expect(r.omitidas).toEqual([{ personaId: P2, motivo: "sin_capa" }]);
    const [l] = c.tabla("nominaLiquidacion") as { diasTrabajados: number; otrosDescuentos: number }[];
    expect(l).toMatchObject({ diasTrabajados: 20, otrosDescuentos: 50_000 });
  });

  it("dryRun no guarda y recalcular no duplica", async () => {
    const c = como();
    await run(c, "nomina.liquidaciones.calcular", { periodoId: PER }, { dryRun: true });
    expect(c.tabla("nominaLiquidacion")).toHaveLength(0);
    await run(c, "nomina.liquidaciones.calcular", { periodoId: PER });
    await run(c, "nomina.liquidaciones.calcular", { periodoId: PER });
    expect(c.tabla("nominaLiquidacion")).toHaveLength(1);
  });

  it("lista y obtiene con detalle; las lecturas quedan auditadas por id", async () => {
    const c = como();
    await run(c, "nomina.liquidaciones.calcular", { periodoId: PER });
    const lista = data<{ items: { id: string; liquido: number }[]; siguiente: null; total: { personas: number; liquido: number } }>(
      await run(c, "nomina.liquidaciones.listar", { periodoId: PER }));
    expect(lista.total.personas).toBe(1);
    expect(lista.total.liquido).toBe(lista.items[0]?.liquido);
    const una = data<{ detalle: { haberes: { concepto: string }[]; otrosDescuentos: { concepto: string; monto: number }[] } }>(
      await run(c, "nomina.liquidaciones.obtener", { id: lista.items[0]?.id }));
    expect(una.detalle.haberes[0]?.concepto).toBe("Sueldo base");
    expect(una.detalle.otrosDescuentos).toEqual([{ concepto: "Anticipos", monto: 50_000 }]);
    const lecturas = (c.tabla("auditEvent") as { capability: string }[]).map((e) => e.capability);
    expect(lecturas).toEqual(expect.arrayContaining(["nomina.liquidaciones.listar", "nomina.liquidaciones.obtener"]));
  });

  it("un período cerrado no se recalcula", async () => {
    expect(await run(como("owner", "cerrado"), "nomina.liquidaciones.calcular", { periodoId: PER }))
      .toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("el gerente no calcula ni lee liquidaciones", async () => {
    const c = como("gerente");
    for (const [id, input] of [["nomina.liquidaciones.calcular", { periodoId: PER }], ["nomina.liquidaciones.listar", { periodoId: PER }]] as const)
      expect(await run(c, id, input)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("con alcance o sin el permiso de sueldos sensibles no calcula ni lee", async () => {
    const alcance = como("owner", "abierto", { alcance: { instalaciones: [] } });
    const sinSensible = como("owner", "abierto", { permisosRol: ["nomina:*"] });
    for (const c of [alcance, sinSensible]) {
      expect(await run(c, "nomina.liquidaciones.calcular", { periodoId: PER })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(await run(c, "nomina.liquidaciones.listar", { periodoId: PER })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(c.tabla("nominaLiquidacion")).toHaveLength(0);
    }
  });

  it("recalcular borra solo a quien ya no tiene vínculo o capa", async () => {
    const c = como();
    (c.tabla("nominaLiquidacion") as Record<string, unknown>[]).push({ id: "vieja", tenantId: T, periodoId: PER, personaId: P2, liquido: 1, costoEmpresa: 1 });
    await run(c, "nomina.liquidaciones.calcular", { periodoId: PER });
    expect((c.tabla("nominaLiquidacion") as { personaId: string }[]).map((l) => l.personaId)).toEqual([P1]);
  });

  it("días en base 30: mes de 31 y febrero", () => {
    expect(diasDelVinculo("2026-12-01", "2026-12-31", "2026-12-02", null)).toBe(29);
    expect(diasDelVinculo("2026-02-01", "2026-02-28", "2026-02-15", null)).toBe(16);
    expect(diasDelVinculo("2026-11-01", "2026-11-30", "2025-01-01", "2026-11-10")).toBe(10);
    expect(diasDelVinculo("2026-11-01", "2026-11-30", "2025-01-01", null)).toBe(30);
  });
});
