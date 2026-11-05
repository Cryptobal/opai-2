// Ingresos esperados del flujo de caja con UN solo criterio de semana (ADR-073): la fecha esperada de cobro de
// cada factura. Lo usan la planilla del flujo, `finanzas.ventas.proyeccion_flujo` y «Hoy en Finanzas». Solo lectura.
import {
  diasEntreCobro,
  fechaEsperadaDeCobro,
  type IngresoProyectadoDesdeDte,
  lunesDe,
  pendienteDeFactura,
  promedioDiasDePago,
  semanaDeCobroEsperado,
  sumarDiasCobro,
} from "@opai/domain";

import { notasCreditoPorDocumento } from "./cobros";
import type { Contexto } from "../types";
import { ingresosDeProgramaciones } from "./ventas-programacion-proyeccion";

/** Fecha de hoy en Chile (aaaa-mm-dd): las semanas del flujo se cuentan con el calendario de Chile, no el de UTC. */
export function hoyChile(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ahora);
}

const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
/** Meses de historia de facturas pagadas que cuentan para el promedio de pago de un cliente. */
const MESES_HISTORIA_PROMEDIO = 24;

export type IngresoEsperado = IngresoProyectadoDesdeDte & {
  /** Día exacto esperado del cobro y de dónde sale (manual, promedio del cliente, vencimiento o emisión). */
  fechaEsperada: string | null;
  origenFecha: "manual" | "promedio" | "vencimiento" | "emision" | "programacion" | null;
};

/** Días promedio de pago por cliente (cuentaId): solo con 3 o más facturas pagadas con cobro conciliado. */
export async function promediosDePagoPorCliente(ctx: Contexto, hoy: string): Promise<Map<string, number>> {
  const desde = sumarDiasCobro(hoy, -30 * MESES_HISTORIA_PROMEDIO);
  const pagadas = await ctx.db.documentoEmitido.findMany({
    where: {
      estadoCobro: "pagada",
      estadoDte: { in: ["enviado", "aceptado"] },
      tipoDte: { notIn: [56, 61] },
      fechaEmision: { gte: new Date(`${desde}T00:00:00Z`) },
    },
    select: { id: true, cuentaId: true, fechaEmision: true },
  });
  if (!pagadas.length) return new Map();
  const cobros = await ctx.db.conciliacionBanco.findMany({
    where: { tipoEnlace: "documento_emitido", activa: true, confirmada: true, enlaceId: { in: pagadas.map((p) => p.id) } },
    select: { enlaceId: true, movimiento: { select: { fecha: true } } },
  });
  const ultimoCobro = new Map<string, string>();
  for (const c of cobros) {
    const f = iso(c.movimiento.fecha);
    if (f && f > (ultimoCobro.get(c.enlaceId) ?? "")) ultimoCobro.set(c.enlaceId, f);
  }
  const diasPorCliente = new Map<string, number[]>();
  for (const p of pagadas) {
    const emision = iso(p.fechaEmision);
    const cobro = ultimoCobro.get(p.id);
    if (!emision || !cobro) continue;
    diasPorCliente.set(p.cuentaId, [...(diasPorCliente.get(p.cuentaId) ?? []), diasEntreCobro(emision, cobro)]);
  }
  const out = new Map<string, number>();
  for (const [cuentaId, dias] of diasPorCliente) {
    const promedio = promedioDiasDePago(dias);
    if (promedio != null) out.set(cuentaId, promedio);
  }
  return out;
}

/**
 * Ingresos por cobrar con su semana esperada: facturas emitidas (pendiente = monto − NC parciales − cobrado), borradores
 * y períodos de programaciones sin borrador. Las cedidas y las notas de débito no cuentan; lo vencido va a la semana en
 * curso. Devuelve todo; quien llama filtra por horizonte.
 */
export async function ingresosEsperados(ctx: Contexto, hoy: string = hoyChile()): Promise<IngresoEsperado[]> {
  const lunesActual = lunesDe(hoy);
  const filas = await ctx.db.documentoEmitido.findMany({
    where: {
      estadoDte: { in: ["borrador", "enviado", "aceptado"] },
      tipoDte: { notIn: [56, 61] },
      AND: [{ OR: [{ cesionEstado: null }, { cesionEstado: { not: "cedido" } }] }],
      NOT: { estadoCobro: { in: ["pagada", "cedida"] } },
    },
    select: {
      id: true, cuentaId: true, instalacionId: true, tipoDte: true, folio: true, fechaEmision: true,
      fechaVencimiento: true, montoTotal: true, montoCobrado: true, estadoDte: true, glosa: true,
    },
  });
  const [promedios, manuales, ncs] = await Promise.all([
    promediosDePagoPorCliente(ctx, hoy),
    filas.length
      ? ctx.db.flujoCobroEsperado.findMany({ where: { documentoId: { in: filas.map((f) => f.id) } }, select: { documentoId: true, fecha: true } })
      : [],
    notasCreditoPorDocumento(ctx.db, filas.filter((f) => f.estadoDte !== "borrador").map((f) => f.id)),
  ]);
  const manual = new Map(manuales.map((m) => [m.documentoId, iso(m.fecha)] as const));
  const out: IngresoEsperado[] = [];
  for (const d of filas) {
    const borrador = d.estadoDte === "borrador";
    const monto = borrador ? d.montoTotal : pendienteDeFactura({ montoTotal: d.montoTotal, montoNotasCredito: ncs.get(d.id) ?? 0, montoCobrado: d.montoCobrado });
    if (monto <= 0) continue;
    const esperada = fechaEsperadaDeCobro({
      manual: manual.get(d.id) ?? null,
      fechaEmision: iso(d.fechaEmision),
      fechaVencimiento: iso(d.fechaVencimiento),
      promedioDias: promedios.get(d.cuentaId) ?? null,
    });
    if (!esperada) continue;
    const folio = d.folio != null ? ` folio ${d.folio}` : "";
    out.push({
      documentoEmitidoId: d.id,
      cuentaId: d.cuentaId,
      instalacionId: d.instalacionId,
      semanaCobro: semanaDeCobroEsperado(esperada.fecha, lunesActual),
      monto,
      etiqueta: `DTE ${d.tipoDte}${folio}${d.glosa ? ` · ${d.glosa}` : ""}`,
      capa: borrador ? "comprometido" : "real",
      fechaEsperada: esperada.fecha,
      origenFecha: esperada.origen,
    });
  }
  const programadas = await ingresosDeProgramaciones(
    ctx,
    sumarDiasCobro(lunesActual, 7 * 53),
    (emision, vencimiento, cuentaId) => {
      const prom = promedios.get(cuentaId);
      return prom != null ? sumarDiasCobro(emision, prom) : vencimiento;
    },
    (fecha) => semanaDeCobroEsperado(fecha, lunesActual),
  );
  return [...out, ...programadas.map((p) => ({ ...p, fechaEsperada: null, origenFecha: "programacion" as const }))];
}
