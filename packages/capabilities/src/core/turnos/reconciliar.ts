import { mismoTurno, type OrigenTurno, type TurnoEsperadoDerivado } from "@opai/domain";
import type { TenantTx } from "@opai/db";

const aFecha = (d: string) => new Date(`${d}T00:00:00.000Z`);

export type Resumen = { creados: number; reemplazados: number; anulados: number; sinCambio: number; omitidos: number };

export const resumenVacio = (): Resumen => ({ creados: 0, reemplazados: 0, anulados: 0, sinCambio: 0, omitidos: 0 });

type Alcance = { origen: OrigenTurno; puestoId?: string; personaIds?: readonly string[]; desde: string; hasta: string };

/**
 * Deja `core.turnos_esperados` igual a `deseados` dentro del alcance, tocando solo lo que cambió: lo
 * que ya coincide queda intacto (idempotente), lo distinto se anula (`vigente = false`) y se escribe
 * una versión nueva, y lo que ya no corresponde se anula. Los turnos `manual` nunca se tocan.
 */
export async function reconciliar(
  tx: TenantTx,
  tenantId: string,
  alcance: Alcance,
  deseados: readonly TurnoEsperadoDerivado[],
  simular = false,
): Promise<Resumen> {
  const r = resumenVacio();
  const rango = { gte: aFecha(alcance.desde), lte: aFecha(alcance.hasta) };
  const filas = await tx.turnoEsperado.findMany({
    where: {
      vigente: true,
      origen: alcance.origen,
      fecha: rango,
      ...(alcance.puestoId ? { puestoId: alcance.puestoId } : {}),
      ...(alcance.personaIds ? { personaId: { in: [...alcance.personaIds] } } : {}),
    },
  });
  const clave = (p: string, i: Date) => `${p}|${i.toISOString()}`;
  const previas = new Map(filas.map((f) => [clave(f.personaId, f.inicio), f]));
  // Otros turnos vigentes de las mismas personas que chocarían con el índice único (otro origen o puesto).
  const ajenos = deseados.length
    ? await tx.turnoEsperado.findMany({
        where: {
          vigente: true,
          personaId: { in: [...new Set(deseados.map((d) => d.personaId))] },
          inicio: { in: deseados.map((d) => d.inicio) },
        },
        select: { id: true, personaId: true, inicio: true },
      })
    : [];
  const propios = new Set(filas.map((f) => f.id));
  const ocupados = new Set(ajenos.filter((a) => !propios.has(a.id)).map((a) => clave(a.personaId, a.inicio)));
  const vistos = new Set<string>();

  for (const d of deseados) {
    const k = clave(d.personaId, d.inicio);
    vistos.add(k);
    if (ocupados.has(k)) { r.omitidos += 1; continue; }
    const previa = previas.get(k);
    const igual =
      previa !== undefined &&
      mismoTurno(d, {
        personaId: previa.personaId, fecha: d.fecha, inicio: previa.inicio, fin: previa.fin,
        instalacionId: previa.instalacionId, puestoId: previa.puestoId, origen: d.origen,
        referencia: previa.referencia, colacionMin: previa.colacionMin, feriado: previa.feriado,
      });
    if (igual) { r.sinCambio += 1; continue; }
    if (simular) { if (previa) r.reemplazados += 1; else r.creados += 1; continue; }
    if (previa) await tx.turnoEsperado.update({ where: { id: previa.id }, data: { vigente: false } });
    await tx.turnoEsperado.create({
      data: {
        tenantId, personaId: d.personaId, fecha: aFecha(d.fecha), inicio: d.inicio, fin: d.fin,
        instalacionId: d.instalacionId, puestoId: d.puestoId, origen: d.origen, referencia: d.referencia,
        colacionMin: d.colacionMin, feriado: d.feriado, version: (previa?.version ?? 0) + 1,
      },
    });
    if (previa) r.reemplazados += 1; else r.creados += 1;
  }
  const sobrantes = filas.filter((f) => !vistos.has(clave(f.personaId, f.inicio)));
  if (sobrantes.length) {
    if (!simular) await tx.turnoEsperado.updateMany({ where: { id: { in: sobrantes.map((f) => f.id) } }, data: { vigente: false } });
    r.anulados += sobrantes.length;
  }
  return r;
}

export function sumar(a: Resumen, b: Resumen): Resumen {
  return {
    creados: a.creados + b.creados, reemplazados: a.reemplazados + b.reemplazados,
    anulados: a.anulados + b.anulados, sinCambio: a.sinCambio + b.sinCambio, omitidos: a.omitidos + b.omitidos,
  };
}
