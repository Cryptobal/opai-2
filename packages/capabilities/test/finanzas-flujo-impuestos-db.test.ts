// CAR-193 · ADR-073 regla 5 y 4: IVA del mes M en M+1 junto con el PPM, postergación del IVA a M+2 marcable por mes
// (el PPM no se posterga).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/finanzas/manifest";
import { FILA_IVA, FILA_PPM } from "../../../modules/finanzas/capacidades/filas-virtuales";
import { hoyIso, lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
const sumarMeses = (periodo: string, n: number) => {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  const i = a * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
};
const lunesDe = (iso: string) => {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return new Date(ms - ((new Date(ms).getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
};

type Planilla = {
  semanas: { semana: string; ingresos: number; egresos: number }[];
  celdas: { filaId: string; semana: string; monto: number; nota: string | null }[];
  filas: { id: string; etiqueta: string }[];
};

describe.skipIf(omitirSuiteDb())("flujo · IVA y PPM (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  const usuario = randomUUID();
  const hoy = hoyIso();
  const mesActual = hoy.slice(0, 7);
  const pagoM1 = `${sumarMeses(mesActual, 1)}-20`;
  const pagoM2 = `${sumarMeses(mesActual, 2)}-20`;

  const ctx = (tid: string) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@iva.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const run = (tid: string, id: string, input: unknown, opts?: { dryRun?: boolean }) => mod.executeCapability(ctx(tid), id, input, opts);
  async function ok<T>(tid: string, id: string, input: unknown): Promise<T> {
    const r = await run(tid, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const planilla = (tid = tenantA) => ok<Planilla>(tid, "finanzas.planilla.obtener", { desde: lunesHoy(), semanas: 16 });
  const total = (p: Planilla, filaId: string, semana?: string) =>
    p.celdas.filter((c) => c.filaId === filaId && (!semana || c.semana === semana)).reduce((t, c) => t + c.monto, 0);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarModulos([manifest]); // los ajustes por empresa (tasa de PPM, cuenta del factoring) salen del manifest
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantA = (await e.admin.tenant.create({ data: { slug: `iva-a-${randomUUID().slice(0, 8)}`, nombre: "A", vertical: "seguridad" } })).id;
    tenantB = (await e.admin.tenant.create({ data: { slug: `iva-b-${randomUUID().slice(0, 8)}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@iva.test`, name: "u" } });
    const cliente = (await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cliente", rut: "76333333-3" } })).id;
    const proveedor = await e.admin.proveedor.create({ data: { tenantId: tenantA, razonSocial: "Proveedor", rut: "76444444-4" } });
    await ok(tenantA, "core.config.set", { modulo: "finanzas", clave: "flujo_tasa_ppm_bps", valor: 100 });
    // Ventas del mes: neto 1.000.000 e IVA 190.000 (dos facturas); compra con IVA crédito de 76.000.
    for (const [neto, iva] of [[600_000, 114_000], [400_000, 76_000]] as const) {
      await e.admin.documentoEmitido.create({
        data: { tenantId: tenantA, cuentaId: cliente, tipoDte: 33, folio: Math.floor(Math.random() * 1e6), fechaEmision: fecha(hoy), fechaVencimiento: fecha(hoy), montoNeto: neto, montoIva: iva, montoTotal: neto + iva, estadoDte: "aceptado" },
      });
    }
    await e.admin.documentoEmitido.create({
        data: { tenantId: tenantA, cuentaId: cliente, tipoDte: 34, folio: 7, fechaEmision: fecha(hoy), montoExento: 2_000_000, montoTotal: 2_000_000, estadoDte: "aceptado", estadoCobro: "cedida", cesionEstado: "cedido" },
    });
    await e.admin.documentoRecibido.create({
      data: { tenantId: tenantA, proveedorId: proveedor.id, tipoDte: 33, folio: 11, fechaEmision: fecha(hoy), fechaRecepcion: fecha(hoy), montoNeto: 400_000, montoIva: 76_000, montoTotal: 476_000, estadoRecepcion: "aceptado" },
    });
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el IVA (débito − crédito) y el PPM del mes se pagan el mes siguiente, como egresos", async () => {
    const p = await planilla();
    // Débito 190.000 − crédito 76.000. Las ventas netas y exentas del mes suman 3.000.000 (incluye la cedida exenta): PPM 1 % = 30.000.
    expect(total(p, FILA_IVA, lunesDe(pagoM1))).toBe(114_000);
    expect(total(p, FILA_PPM, lunesDe(pagoM1))).toBe(30_000);
    const sem = p.semanas.find((s) => s.semana === lunesDe(pagoM1));
    expect(sem?.egresos).toBeGreaterThanOrEqual(144_000);
    expect(p.filas.map((f) => f.etiqueta)).toEqual(expect.arrayContaining(["IVA a pagar", "PPM"]));
  });

  it("postergar el IVA lo lleva a M+2 y el PPM sigue en M+1; la vista previa no escribe; otra empresa no se ve afectada", async () => {
    const vista = await run(tenantA, "finanzas.flujo.postergar_iva", { periodo: mesActual, postergar: true }, { dryRun: true });
    expect(vista.ok && vista.data).toMatchObject({ postergado: true, cambio: true });
    expect(await e.admin.flujoIvaPostergado.count({ where: { tenantId: tenantA } })).toBe(0);

    await ok(tenantA, "finanzas.flujo.postergar_iva", { periodo: mesActual, postergar: true });
    const p = await planilla();
    expect(total(p, FILA_IVA, lunesDe(pagoM1))).toBe(0);
    expect(total(p, FILA_IVA, lunesDe(pagoM2))).toBe(114_000);
    expect(total(p, FILA_PPM, lunesDe(pagoM1))).toBe(30_000); // el PPM no se posterga
    expect(p.celdas.find((c) => c.filaId === FILA_IVA)?.nota).toContain("postergado");
    expect(await e.admin.flujoIvaPostergado.count({ where: { tenantId: tenantB } })).toBe(0);

    await ok(tenantA, "finanzas.flujo.postergar_iva", { periodo: mesActual, postergar: false });
    expect(total(await planilla(), FILA_IVA, lunesDe(pagoM1))).toBe(114_000);
  });

  it("otra empresa no ve los impuestos de la primera", async () => {
    const p = await planilla(tenantB);
    expect(p.celdas.some((c) => c.filaId === FILA_IVA || c.filaId === FILA_PPM)).toBe(false);
  });
});
