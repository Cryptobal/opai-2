// CAR-349 bloque 2: recurrentes en UF y en % de ventas. Datos sintéticos; Postgres real con un rol sin BYPASSRLS.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
const mesAnterior = (iso: string) => {
  const [a, m] = [Number(iso.slice(0, 4)), Number(iso.slice(5, 7))];
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
};
type Celda = { filaId: string; semana: string; monto: number; nota: string | null };

describe.skipIf(omitirSuiteDb())("flujo · recurrentes en UF y % de ventas (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let fila = "";
  const ufCreadas: string[] = [];
  const usuario = randomUUID();
  const lunes = lunesHoy();

  const ctx = () =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@recu.test", platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
    });
  const run = (id: string, input: unknown, opts?: { dryRun?: boolean }) => mod.executeCapability(ctx(), id, input, opts);
  async function ok<T>(id: string, input: unknown): Promise<T> {
    const r = await run(id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const cuotasDe = async (concepto: string) =>
    (await ok<{ celdas: Celda[] }>("finanzas.planilla.obtener", { desde: lunes, semanas: 6 })).celdas.filter((c) => c.filaId === fila && c.nota?.startsWith(concepto));

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    const s = randomUUID().slice(0, 8);
    tenantId = (await e.admin.tenant.create({ data: { slug: `recu-${s}`, nombre: "R", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${s}@recu.test`, name: "u" } });
    fila = (await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Retiro socio QA" })).id;
  });
  afterAll(async () => {
    if (ufCreadas.length) await e.admin.valorPublicado.deleteMany({ where: { id: { in: ufCreadas } } });
    await e?.cerrar();
  });

  it("valida la unidad y el tope del 100 %; la vista previa muestra la unidad", async () => {
    const base = { filaId: fila, concepto: "Pct", frecuencia: "mensual", diaDelMes: 5, inicio: lunes };
    expect((await run("finanzas.recurrentes.crear", { ...base, unidad: "pct_ventas", monto: 1_000_001 })).ok).toBe(false);
    expect((await run("finanzas.recurrentes.crear", { ...base, unidad: "dolares", monto: 1 })).ok).toBe(false);
    const p = await run("finanzas.recurrentes.crear", { ...base, unidad: "uf", monto: 125_000 }, { dryRun: true });
    expect(p.ok && (p.data as { unidad: string }).unidad).toBe("uf");
  });

  it("UF: cada cuota usa la UF publicada de su día", async () => {
    const uf = await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } });
    const dias = [mas(lunes, 2), mas(lunes, 9)];
    for (const [i, d] of dias.entries()) {
      const v = await e.admin.valorPublicado.create({ data: { indicadorId: uf.id, valorJson: 4_000_000 + i * 10_000, vigenteDesde: fecha(d), estado: "vigente", fuente: "prueba CAR-349" } });
      ufCreadas.push(v.id);
    }
    await ok("finanzas.recurrentes.crear", { filaId: fila, concepto: "Arriendo UF", unidad: "uf", monto: 125_000, frecuencia: "semanal", inicio: dias[0], repeticiones: 2 });
    const c = await cuotasDe("Arriendo UF");
    // 12,5 UF × $40.000 y × $40.100.
    expect(c.map((x) => x.monto)).toEqual([500_000, 501_250]);
  });

  it("% de ventas: sobre las ventas netas del mes anterior (la nota de crédito resta) y marca lo estimado", async () => {
    const cuota = mas(lunes, 3);
    const periodo = mesAnterior(cuota);
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente QA", rut: "76543210-3" } })).id;
    const doc = (tipoDte: number, folio: number, neto: number) =>
      e.admin.documentoEmitido.create({ data: { tenantId, cuentaId: cuenta, tipoDte, folio, estadoDte: "aceptado", fechaEmision: fecha(`${periodo}-10`), montoNeto: neto, montoIva: 0, montoTotal: neto } });
    await doc(33, 9001, 20_000_000);
    await doc(61, 9002, 4_000_000);
    await ok("finanzas.recurrentes.crear", { filaId: fila, concepto: "Retiro 5%", unidad: "pct_ventas", monto: 50_000, frecuencia: "semanal", inicio: cuota, repeticiones: 1 });
    const [c] = await cuotasDe("Retiro 5%");
    expect(c?.monto).toBe(800_000);
  });
});
