// CAR-393 parte 2c (referente Deputy / When I Work: el time off aprobado manda sobre el turno que se asigna después).
// Al fijar una serie, la ausencia sigue a la persona: los días del puesto que dejan de ser turnos de quien faltaba se
// liberan, y los que el nuevo titular trabaja dentro de una ausencia aprobada suya quedan marcados y enlazados al
// registro, en la misma transacción. Las excepciones sin registro (reemplazos, refuerzos) no se tocan.
import type { TenantTx } from "@opai/db";
import { rangoDias, serieVigente, trabajaEn } from "@opai/domain";

import type { Contexto } from "../types";
import { anotar } from "./anotar";
import { cargarSeriesDe } from "./cargar";
import { aFechaDb, fechaIso } from "./comun";

type Destino = { puestoId: string; instalacionId: string; titularId: string | null; desde: string };

/** Libera los días que ya no son turnos de quien faltaba y marca los del titular en sus ausencias; devuelve los marcados. */
export async function marcarAusenciasDelTitular(
  tx: TenantTx,
  ctx: Contexto,
  d: Destino,
): Promise<number> {
  const titular = d.titularId;
  const series = (await cargarSeriesDe({ ...ctx, db: tx }, [d.puestoId])).get(d.puestoId) ?? [];
  const turnoDe = (personaId: string | null, f: string) => {
    const v = serieVigente(series, f);
    return !!personaId && v?.titularId === personaId && trabajaEn(v.patron, v.inicioCiclo, f);
  };
  const activas = await tx.excepcionPauta.findMany({
    where: { puestoId: d.puestoId, estado: "activa", fecha: { gte: aFechaDb(d.desde) } },
    select: { id: true, fecha: true, personaId: true, ausenciaId: true },
  });
  const usuario = ctx.usuario?.id ?? null;
  const liberar = activas.filter((e) => e.ausenciaId && !turnoDe(e.personaId, fechaIso(e.fecha)));
  if (liberar.length) {
    await tx.excepcionPauta.updateMany({
      where: { id: { in: liberar.map((e) => e.id) }, estado: "activa" },
      data: { estado: "anulada", anuladaPor: usuario, anuladaEn: new Date() },
    });
    const fechas = liberar.map((e) => fechaIso(e.fecha)).sort();
    const rango = { desde: fechas[0]!, hasta: fechas[fechas.length - 1]! };
    await anotar(tx, ctx, {
      instalacionId: d.instalacionId,
      puestoId: d.puestoId,
      accion: "excepcion_anulada",
      ...rango,
      detalle: { dias: liberar.length, origen: "cambio_de_titular" },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "pauta.excepcion.anulada",
      entidadTipo: "puesto",
      entidadId: d.puestoId,
      payload: { puestoId: d.puestoId, ...rango },
    });
  }
  const fuera = new Set(liberar.map((e) => e.id));
  const ocupadas = new Set(activas.filter((e) => !fuera.has(e.id)).map((e) => fechaIso(e.fecha)));
  if (!titular) return 0;
  const ausencias = await tx.ausencia.findMany({
    where: { personaId: titular, estado: "aprobada", hasta: { gte: aFechaDb(d.desde) } },
    select: { id: true, tipo: true, motivo: true, desde: true, hasta: true },
    orderBy: { desde: "asc" },
  });
  let total = 0;
  for (const a of ausencias) {
    const inicio = fechaIso(a.desde) > d.desde ? fechaIso(a.desde) : d.desde;
    const dias = rangoDias(inicio, fechaIso(a.hasta)).filter(
      (f) => !ocupadas.has(f) && turnoDe(titular, f),
    );
    if (dias.length === 0) continue;
    for (const f of dias) ocupadas.add(f);
    await tx.excepcionPauta.createMany({
      data: dias.map((f) => ({
        tenantId: ctx.tenantId,
        puestoId: d.puestoId,
        fecha: aFechaDb(f),
        tipo: a.tipo,
        motivo: a.motivo,
        personaId: titular,
        ausenciaId: a.id,
        creadaPor: usuario,
      })),
    });
    // Sin motivo en el historial (texto libre que puede ser de salud), igual que al registrar.
    await anotar(tx, ctx, {
      instalacionId: d.instalacionId,
      puestoId: d.puestoId,
      accion: "excepcion_creada",
      desde: dias[0]!,
      hasta: dias[dias.length - 1]!,
      detalle: { tipo: a.tipo, dias: dias.length, personaId: titular, origen: "ausencia_vigente" },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "pauta.excepcion.creada",
      entidadTipo: "puesto",
      entidadId: d.puestoId,
      payload: {
        puestoId: d.puestoId,
        tipo: a.tipo,
        desde: dias[0]!,
        hasta: dias[dias.length - 1]!,
      },
    });
    total += dias.length;
  }
  return total;
}
