import type { Contexto } from "@opai/capabilities";

/** Entidad afectada, ya autorizada para quien mira: tipo, id y, si es seguro, el nombre de la ficha. */
export type EntidadHistorial = { tipo: string; id: string; etiqueta: string | null };
export type RefEntidad = { tipo: string; id: string };

// Permiso de lectura de la ficha por tipo. Un tipo fuera de esta lista (documentos, aprobaciones,
// configuración…) nunca se revela en el historial del agente.
const PERMISO: Record<string, string> = {
  cuenta: "core:cuentas.read",
  instalacion: "core:instalaciones.read",
  persona: "core:personas.read",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Filtra las entidades por permiso y alcance (ADR-022) en la consulta y devuelve solo tipo, id y el
 * nombre de cuentas e instalaciones. Las personas van sin nombre (dato personal, Ley 21.719) y un
 * actor acotado a instalaciones solo ve las cuentas e instalaciones a su cargo.
 */
export async function entidadesVisibles(
  ctx: Contexto,
  refs: readonly RefEntidad[],
): Promise<Map<string, EntidadHistorial>> {
  const visibles = new Map<string, EntidadHistorial>();
  const ids = (tipo: string) => [
    ...new Set(
      refs
        .filter((r) => r.tipo === tipo && UUID.test(r.id) && ctx.autorizar(PERMISO[tipo] ?? ""))
        .map((r) => r.id),
    ),
  ];
  const acotado = ctx.alcance ? [...ctx.alcance.instalaciones] : null;
  const cuentas = ids("cuenta");
  const instalaciones = ids("instalacion");
  const personas = ids("persona");
  if (cuentas.length) {
    const filas = await ctx.db.cuenta.findMany({
      where: {
        id: { in: cuentas },
        ...(acotado ? { instalaciones: { some: { id: { in: acotado } } } } : {}),
      },
      select: { id: true, nombre: true },
    });
    for (const f of filas)
      visibles.set(`cuenta:${f.id}`, { tipo: "cuenta", id: f.id, etiqueta: f.nombre });
  }
  if (instalaciones.length) {
    const permitidas = acotado ? instalaciones.filter((i) => acotado.includes(i)) : instalaciones;
    const filas = await ctx.db.instalacion.findMany({
      where: { id: { in: permitidas } },
      select: { id: true, nombre: true },
    });
    for (const f of filas)
      visibles.set(`instalacion:${f.id}`, { tipo: "instalacion", id: f.id, etiqueta: f.nombre });
  }
  if (personas.length && !acotado) {
    const filas = await ctx.db.persona.findMany({
      where: { id: { in: personas } },
      select: { id: true },
    });
    for (const f of filas)
      visibles.set(`persona:${f.id}`, { tipo: "persona", id: f.id, etiqueta: null });
  }
  return visibles;
}
