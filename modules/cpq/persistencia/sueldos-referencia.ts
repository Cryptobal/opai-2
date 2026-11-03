import type { Contexto } from "@opai/capabilities";

export type SueldoReferenciaVigente = { cargoId: string; sueldoBaseClp: number; vigenteDesde: string };

const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Sueldo de referencia vigente por cargo a la fecha (ADR-021: configuración versionada; rige la fila de
 * mayor `vigente_desde` no futura). Una sola consulta para todos los cargos pedidos.
 */
export async function sueldosReferenciaVigentes(
  ctx: Contexto,
  fecha: string,
  cargoIds?: readonly string[],
): Promise<Map<string, SueldoReferenciaVigente>> {
  const filas = await ctx.db.cpqSueldoReferencia.findMany({
    where: {
      vigenteDesde: { lte: new Date(`${fecha}T00:00:00Z`) },
      ...(cargoIds ? { cargoId: { in: [...cargoIds] } } : {}),
    },
    orderBy: [{ vigenteDesde: "desc" }],
  });
  const r = new Map<string, SueldoReferenciaVigente>();
  for (const f of filas) {
    if (r.has(f.cargoId)) continue;
    r.set(f.cargoId, { cargoId: f.cargoId, sueldoBaseClp: f.sueldoBaseClp, vigenteDesde: dia(f.vigenteDesde) });
  }
  return r;
}
