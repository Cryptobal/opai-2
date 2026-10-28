import type { Contexto } from "../../types";

const PRIORIDAD = ["persona", "puesto", "instalacion"] as const;

/**
 * Capa de sueldo que rige a la persona del anexo en `fecha` (RUT → puesto → instalación, sin
 * herencia), con la instalación y el puesto del vínculo del anexo. Sirve para completar el lado del
 * documento que el snapshot no trae: el «antes» de una capa nueva sin versión previa (no cierra
 * ninguna) y el «después» de una anulación. Excluye la estructura que el propio anexo ya muestra.
 */
export async function capaQueRige(
  ctx: Contexto,
  anexo: { personaId: string; vinculoId: string },
  fecha: Date,
  excluirId: string | null,
) {
  const vinculo = await ctx.db.vinculoLaboral.findFirst({
    where: { id: anexo.vinculoId, personaId: anexo.personaId },
  });
  const refs = [
    { nivel: "persona", personaId: anexo.personaId },
    ...(vinculo?.puestoId ? [{ nivel: "puesto", puestoId: vinculo.puestoId }] : []),
    ...(vinculo?.instalacionId
      ? [{ nivel: "instalacion", instalacionId: vinculo.instalacionId }]
      : []),
  ];
  const candidatas = await ctx.db.estructuraSueldo.findMany({
    where: {
      OR: refs,
      estado: "vigente",
      vigenteDesde: { lte: fecha },
      AND: [{ OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fecha } }] }],
      ...(excluirId ? { NOT: { id: excluirId } } : {}),
    },
    orderBy: { vigenteDesde: "desc" },
  });
  for (const nivel of PRIORIDAD) {
    const capa = candidatas.find((c) => c.nivel === nivel);
    if (capa) return capa;
  }
  return null;
}

/** Día anterior a `fecha` (UTC): el último día en que regía la capa previa. */
export const diaAnterior = (fecha: Date) => new Date(fecha.getTime() - 86_400_000);
