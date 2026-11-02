import type { OverlayRegistro } from "@opai/domain";

import type { Contexto } from "../types";
import { fechaIso } from "./comun";

function overlayDesdeRegistros(
  filas: readonly { fecha: Date; tipo: string; personaId: string | null }[],
): Map<string, OverlayRegistro> {
  const map = new Map<string, OverlayRegistro>();
  for (const r of filas) {
    const f = fechaIso(r.fecha);
    const prev = map.get(f) ?? {};
    if (r.tipo === "cobertura_confirmada") map.set(f, { ...prev, confirmado: true });
    else if (r.tipo === "marca_presencia") {
      map.set(f, { ...prev, marcaManual: true, ...(r.personaId ? { personaId: r.personaId } : {}) });
    }
  }
  return map;
}

/** Registros operativos activos de un puesto en un rango de fechas. */
export async function cargarRegistros(
  ctx: Contexto,
  puestoIds: readonly string[],
  primero: Date,
  ultimo: Date,
): Promise<Map<string, Map<string, OverlayRegistro>>> {
  const porPuesto = new Map<string, Map<string, OverlayRegistro>>();
  if (!puestoIds.length) return porPuesto;
  const filas = await ctx.db.registroOperativoPauta.findMany({
    where: {
      puestoId: { in: [...puestoIds] },
      estado: "activa",
      fecha: { gte: primero, lte: ultimo },
    },
  });
  for (const id of puestoIds) {
    porPuesto.set(id, overlayDesdeRegistros(filas.filter((x) => x.puestoId === id)));
  }
  return porPuesto;
}
