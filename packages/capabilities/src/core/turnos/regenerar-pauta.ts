import {
  derivarTurnosDePauta,
  fechasDelMesPauta,
  serieVigente,
  trabajaEn,
  type CeldaPauta,
} from "@opai/domain";

import type { Contexto } from "../../types";
import { cargarMes, cargarSeries } from "../../pauta/cargar";
import { reconciliar, resumenVacio, sumar, type Resumen } from "./reconciliar";
import { zonaDelTenant } from "./comun";

/** Meses «aaaa-mm» que toca el rango [desde, hasta]. */
function mesesDe(desde: string, hasta: string): [number, number][] {
  const salida: [number, number][] = [];
  let [y, m] = desde.split("-").map(Number) as [number, number];
  const [yf, mf] = hasta.split("-").map(Number) as [number, number];
  while (y < yf || (y === yf && m <= mf)) {
    salida.push([y, m]);
    if (m === 12) { y += 1; m = 1; } else m += 1;
  }
  return salida;
}

/**
 * Regenera los turnos esperados de un puesto en [desde, hasta] a partir de su serie, sus excepciones y
 * los feriados (la misma expansión que muestra la Pauta). Solo reescribe lo que cambió. Un puesto
 * inactivo o inexistente deja sus turnos no vigentes.
 */
export async function regenerarPuesto(
  ctx: Contexto,
  puestoId: string,
  desde: string,
  hasta: string,
  zonaDada?: string,
  simular = false,
): Promise<Resumen> {
  const puesto = await ctx.db.puesto.findUnique({
    where: { id: puestoId },
    select: {
      id: true, instalacionId: true, estado: true, horaInicio: true, horaFin: true,
      colacionMin: true, colacionFuera: true,
    },
  });
  const alcance = { origen: "pauta" as const, puestoId, desde, hasta };
  if (!puesto || puesto.estado !== "activo")
    return ctx.transaccion((tx) => reconciliar(tx, ctx.tenantId, alcance, [], simular));

  const zona = zonaDada ?? (await zonaDelTenant(ctx));
  const inst = await ctx.db.instalacion.findUnique({ where: { id: puesto.instalacionId }, select: { id: true, region: true } });
  const series = await cargarSeries(ctx, puestoId);
  const celdas: CeldaPauta[] = [];
  for (const [anio, mes] of mesesDe(desde, hasta)) {
    const mesCargado = await cargarMes(ctx, [puesto], inst ? [inst] : [], anio, mes);
    const dias = new Set(fechasDelMesPauta(anio, mes));
    celdas.push(...(mesCargado.celdas.get(puestoId) ?? []).filter((c) => dias.has(c.fecha) && c.fecha >= desde && c.fecha <= hasta));
  }
  const deseados = derivarTurnosDePauta({
    celdas,
    zona,
    puesto: {
      id: puesto.id,
      instalacionId: puesto.instalacionId,
      horaInicio: puesto.horaInicio,
      horaFin: puesto.horaFin,
      colacionMin: puesto.colacionFuera ? 0 : puesto.colacionMin,
    },
    referencia: (c) => {
      if (c.excepcion) return `excepcion:${puestoId}:${c.fecha}`;
      const s = serieVigente(series, c.fecha);
      return s ? `serie:${s.id}` : null;
    },
    titularTrabaja: (fecha) => {
      const s = serieVigente(series, fecha);
      return Boolean(s?.titularId) && trabajaEn(s!.patron, s!.inicioCiclo, fecha);
    },
  });
  return ctx.transaccion((tx) => reconciliar(tx, ctx.tenantId, alcance, deseados, simular));
}

/** Regenera varios puestos; suma los resúmenes. */
export async function regenerarPuestos(
  ctx: Contexto, puestoIds: readonly string[], desde: string, hasta: string, simular = false,
): Promise<Resumen> {
  const zona = await zonaDelTenant(ctx);
  let total = resumenVacio();
  for (const id of puestoIds) total = sumar(total, await regenerarPuesto(ctx, id, desde, hasta, zona, simular));
  return total;
}
