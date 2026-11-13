import type { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { claveLibre, emparejarMovimientos, formatearFecha, type FilaCartolaParseada } from "@opai/domain";

import type { filaPreviewSchema } from "./esquemas";
import { aFecha, aIso } from "./util";

/** Días de tolerancia entre la fecha del banco en línea (o de otra cartola) y la de la cartola (CAR-341). */
export const TOLERANCIA_DIAS = 3;

const sumarDias = (iso: string, n: number) => aIso(new Date(aFecha(iso).getTime() + n * 86_400_000));

/** Un movimiento ya guardado que la cartola trae con otra fecha: manda la fecha de la cartola. */
export type AjusteFecha = {
  existenteId: string;
  fecha: string;
  claveDedupe: string;
  saldoDespues: number | null;
  referencia: string | null;
};

type Preview = z.infer<typeof filaPreviewSchema>;

const ORIGEN: Record<string, string> = { web4leads: "la sincronización con el banco", cartola: "otra cartola", manual: "un registro manual" };

/**
 * Cruza las filas de la cartola con los movimientos ya guardados de la cuenta (sincronización, otras cartolas o
 * manuales) en el rango de la cartola ± la tolerancia. Lo que ya existe se omite; si existe con otra fecha, se ajusta
 * a la fecha de la cartola. Lo demás entra con una huella libre. Solo lectura.
 */
export async function emparejarCartola(ctx: Contexto, cuentaId: string, filas: FilaCartolaParseada[]) {
  const fechas = filas.map((f) => f.fecha).sort();
  const previews: Preview[] = [];
  const nuevos: FilaCartolaParseada[] = [];
  const ajustes: AjusteFecha[] = [];
  if (!fechas.length) return { previews, nuevos, ajustes, duplicados: 0 };
  const guardados = await ctx.db.movimientoBancario.findMany({
    where: {
      cuentaId,
      fecha: { gte: aFecha(sumarDias(fechas[0]!, -TOLERANCIA_DIAS)), lte: aFecha(sumarDias(fechas.at(-1)!, TOLERANCIA_DIAS)) },
    },
    select: { id: true, fecha: true, monto: true, glosa: true, referencia: true, claveDedupe: true, origen: true, saldoDespues: true },
  });
  const existentes = guardados.map((g) => ({ id: g.id, fecha: aIso(g.fecha), monto: Number(g.monto), glosa: g.glosa, referencia: g.referencia }));
  const porId = new Map(guardados.map((g) => [g.id, g]));
  const ocupadas = new Set(guardados.map((g) => g.claveDedupe));
  const pares = emparejarMovimientos(filas, existentes, { toleranciaDias: TOLERANCIA_DIAS });
  let duplicados = 0;

  filas.forEach((f, i) => {
    const base = { indice: f.indice, fecha: f.fecha, monto: f.monto, glosa: f.glosa };
    const par = pares.get(i);
    if (!par) {
      nuevos.push({ ...f, claveDedupe: claveLibre(f.claveDedupe, ocupadas) });
      previews.push({ ...base, estado: "leida", motivo: null });
      return;
    }
    duplicados += 1;
    const g = porId.get(par.existenteId)!;
    const deDonde = ORIGEN[g.origen] ?? "otra carga";
    if (par.fechaExistente !== f.fecha) {
      ajustes.push({
        existenteId: g.id,
        fecha: f.fecha,
        claveDedupe: claveLibre(f.claveDedupe, ocupadas),
        saldoDespues: g.saldoDespues == null ? f.saldoDespues : null,
        referencia: g.referencia == null ? f.referencia : null,
      });
      const motivo = `Ya entró por ${deDonde} con fecha ${formatearFecha(par.fechaExistente)}; queda con la fecha de la cartola.`;
      previews.push({ ...base, estado: "duplicada", motivo });
      return;
    }
    const motivo = par.por === "exacta" ? "Ya existe con la misma huella." : `Ya entró por ${deDonde}.`;
    previews.push({ ...base, estado: "duplicada", motivo });
  });
  return { previews, nuevos, ajustes, duplicados };
}
