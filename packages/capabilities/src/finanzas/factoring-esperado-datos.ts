// Factoring en el flujo (ADR-073, regla 4): el ingreso de una factura cedida es el depósito neto del factor, no la
// factura; la diferencia (monto − depósito) es solo informativa. Solo lectura.
import { lunesDe } from "@opai/domain";

import type { Contexto } from "../types";
import { hoyChile, type IngresoEsperado } from "./cobro-esperado-datos";

const fechaChile = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type DiferenciaFactoring = { cesionId: string; semana: string; monto: number; factorNombre: string | null; folio: number | null };

/**
 * Depósitos del factor por esperar y diferencias informativas. Una cesión cuyo depósito ya está conciliado no se
 * proyecta (el ingreso lo trae la cartola por su fecha de banco) y su diferencia cae en la semana de ese depósito;
 * si no, el depósito esperado (el anticipo) cae en la semana de la cesión, o en la actual si ya pasó.
 */
export async function cesionesEsperadas(
  ctx: Contexto,
  hoy: string = hoyChile(),
): Promise<{ depositos: (IngresoEsperado & { rutFactor: string; cesionId: string })[]; diferencias: DiferenciaFactoring[] }> {
  const lunesActual = lunesDe(hoy);
  const cesiones = await ctx.db.cesion.findMany({
    where: { estado: { notIn: ["simulada", "anulada"] } },
    select: {
      id: true, anticipo: true, createdAt: true, factorRut: true, factorNombre: true,
      documento: { select: { id: true, montoTotal: true, folio: true, cuentaId: true, instalacionId: true } },
    },
  });
  if (!cesiones.length) return { depositos: [], diferencias: [] };
  const conc = await ctx.db.conciliacionBanco.findMany({
    where: { tipoEnlace: "documento_emitido", activa: true, confirmada: true, enlaceId: { in: cesiones.map((c) => c.documento.id) } },
    select: { enlaceId: true, monto: true, movimiento: { select: { fecha: true } } },
  });
  const depositos: (IngresoEsperado & { rutFactor: string; cesionId: string })[] = [];
  const diferencias: DiferenciaFactoring[] = [];
  for (const c of cesiones) {
    const folio = c.documento.folio;
    const propias = conc.filter((x) => x.enlaceId === c.documento.id);
    if (propias.length) {
      const real = propias.reduce((t, x) => t + Number(x.monto), 0);
      const fecha = propias.map((x) => iso(x.movimiento.fecha)).sort().at(-1) ?? hoy;
      diferencias.push({ cesionId: c.id, semana: lunesDe(fecha), monto: Math.max(0, c.documento.montoTotal - real), factorNombre: c.factorNombre, folio });
      continue;
    }
    const semana = lunesDe(fechaChile(c.createdAt)) < lunesActual ? lunesActual : lunesDe(fechaChile(c.createdAt));
    diferencias.push({ cesionId: c.id, semana, monto: Math.max(0, c.documento.montoTotal - c.anticipo), factorNombre: c.factorNombre, folio });
    if (c.anticipo <= 0) continue;
    depositos.push({
      documentoEmitidoId: null,
      cuentaId: c.documento.cuentaId,
      instalacionId: c.documento.instalacionId,
      semanaCobro: semana,
      monto: c.anticipo,
      etiqueta: `Depósito del factor${c.factorNombre ? ` ${c.factorNombre}` : ""}${folio != null ? ` · folio ${folio}` : ""}`,
      capa: "comprometido",
      fechaEsperada: null,
      origenFecha: "cesion",
      rutFactor: c.factorRut,
      cesionId: c.id,
    });
  }
  return { depositos, diferencias };
}
