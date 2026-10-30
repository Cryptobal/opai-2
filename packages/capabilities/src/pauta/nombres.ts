import type { Contexto } from "../types";
import type { SerieCargada } from "./cargar";
import type { SerieVista } from "./vistas";

/** Nombre completo de cada persona (una sola consulta, bajo la RLS del tenant). */
export async function nombresDePersonas(
  ctx: Contexto,
  ids: Iterable<string | null>,
): Promise<Map<string, string>> {
  const unicos = [...new Set([...ids].filter((i): i is string => !!i))];
  if (unicos.length === 0) return new Map();
  const filas = await ctx.db.persona.findMany({
    where: { id: { in: unicos } },
    select: { id: true, nombres: true, apellidos: true },
  });
  return new Map(filas.map((p) => [p.id, `${p.nombres} ${p.apellidos}`]));
}

/** Vista de una serie con el nombre del patrón y del titular ya resueltos. */
export function vistaSerie(
  s: SerieCargada,
  nombres: ReadonlyMap<string, string>,
): SerieVista {
  return {
    id: s.id,
    patronId: s.patronId,
    patron: s.patronNombre,
    inicioCiclo: s.inicioCiclo,
    titularId: s.titularId,
    titular: s.titularId ? (nombres.get(s.titularId) ?? null) : null,
    desde: s.desde,
    hasta: s.hasta,
  };
}
