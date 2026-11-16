/** Grupos de la lista de Novedades (CAR-430), de la más nueva a la más antigua. */
export type GrupoNovedades<T> = { id: "hoy" | "semana" | "antes"; titulo: string; items: T[] };

const TITULOS = { hoy: "Hoy", semana: "Esta semana", antes: "Antes" } as const;

/** Días entre dos fechas `aaaa-mm-dd` (sin hora: el catálogo de novedades no la tiene). */
function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * Agrupa por fecha: «Hoy», «Esta semana» (los 6 días anteriores) y «Antes». Respeta el orden en que
 * llegan (el catálogo ya viene de la más nueva a la más antigua) y omite los grupos vacíos.
 */
export function agruparNovedades<T extends { fecha: string }>(
  items: readonly T[],
  hoy: string,
): GrupoNovedades<T>[] {
  const grupos: GrupoNovedades<T>[] = (["hoy", "semana", "antes"] as const).map((id) => ({
    id,
    titulo: TITULOS[id],
    items: [],
  }));
  for (const item of items) {
    const dias = diasEntre(item.fecha, hoy);
    const grupo = dias <= 0 ? grupos[0] : dias < 7 ? grupos[1] : grupos[2];
    grupo?.items.push(item);
  }
  return grupos.filter((g) => g.items.length > 0);
}

/** Fecha de hoy `aaaa-mm-dd` en la hora de Chile (la de las fechas del catálogo). */
export function hoyEnChile(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ahora);
}
