// CAR-378: resumen del flujo por semana o mes, indicadores de caja y escenario de cobros atrasados.
// Datos sintéticos; Postgres real con un rol sin BYPASSRLS.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Resumen = {
  fuenteSaldo: string;
  periodos: { clave: string; semanas: number; egresos: number; saldoFinal: number; tono: string | null }[];
  indicadores: { primerNegativo: { semana: string } | null; semanasDeCaja: number; finHorizonte: { saldo: number } | null };
};

describe.skipIf(omitirSuiteDb())("flujo · resumen por mes e indicadores (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let otro = "";
  const usuario = randomUUID();
  const lunes = lunesHoy();

  const ok = async <T,>(id: string, input: unknown, t = tenantId): Promise<T> => {
    const r = await mod.executeCapability(
      mod.crearContexto({
        tenantId: t, actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "u", email: "u@res.test", platformRole: null },
        portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
      }),
      id, input,
    );
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    const s = randomUUID().slice(0, 8);
    tenantId = (await e.admin.tenant.create({ data: { slug: `res-${s}`, nombre: "R", vertical: "seguridad" } })).id;
    otro = (await e.admin.tenant.create({ data: { slug: `res-b-${s}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${s}@res.test`, name: "u" } });
    await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco QA", numeroVisible: "0001", activa: true, saldoBanco: 1_000_000n, saldoBancoEn: new Date() } });
    const fila = (await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Arriendo QA" })).id;
    await ok("finanzas.recurrentes.crear", { filaId: fila, concepto: "Arriendo", monto: 300_000, frecuencia: "semanal", inicio: lunes });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("por semana: parte del saldo del banco y marca la primera semana negativa", async () => {
    const r = await ok<Resumen>("finanzas.planilla.resumen", { agrupar: "semana", semanas: 6 });
    expect(r.fuenteSaldo).toBe("banco");
    expect(r.periodos).toHaveLength(6);
    expect(r.periodos.every((p) => p.egresos === 300_000)).toBe(true);
    // 1.000.000 − 300.000 por semana: negativo en la cuarta semana.
    expect(r.indicadores.primerNegativo?.semana).toBe(r.periodos[3]?.clave);
    expect(r.indicadores.semanasDeCaja).toBe(3);
    expect(r.indicadores.finHorizonte?.saldo).toBe(1_000_000 - 6 * 300_000);
  });

  it("por mes: las mismas semanas agrupadas, con el saldo de la última y el peor tono", async () => {
    const r = await ok<Resumen>("finanzas.planilla.resumen", { agrupar: "mes", semanas: 6 });
    expect(r.periodos.reduce((a, p) => a + p.semanas, 0)).toBe(6);
    expect(r.periodos.at(-1)?.saldoFinal).toBe(1_000_000 - 6 * 300_000);
    expect(r.periodos.at(-1)?.tono).toBe("peligro");
  });

  it("el escenario de cobros atrasados sin cobros no cambia nada y no escribe", async () => {
    const base = await ok<Resumen>("finanzas.planilla.resumen", { semanas: 6 });
    const atraso = await ok<Resumen>("finanzas.planilla.resumen", { semanas: 6, atrasoCobrosSemanas: 3 });
    expect(atraso.periodos).toEqual(base.periodos);
    expect(await e.admin.flujoCelda.count({ where: { tenantId } })).toBe(0);
  });

  it("otra empresa no ve los egresos ni el saldo del banco", async () => {
    const r = await ok<Resumen>("finanzas.planilla.resumen", { agrupar: "semana", semanas: 4 }, otro);
    expect(r.periodos.every((p) => p.egresos === 0)).toBe(true);
    expect(r.fuenteSaldo).toBe("ajustes");
  });
});
