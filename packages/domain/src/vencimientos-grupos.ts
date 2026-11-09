// Vencimientos de documentos agrupados para la pantalla «Vencimientos» (Documentos v4 · 04).
// Dominio puro: fechas de calendario "aaaa-mm-dd", sin reloj ni zona (quien llama pasa `hoy`).

import { diasHasta } from "./vigencia";

/** Avisos por defecto de B2 (30 y 60 días); la configuración por tenant llega con la pantalla 10. */
export const VENTANAS_VENCIMIENTO_DEFECTO = [30, 60] as const;

export type GrupoVencimiento<T> = {
  /** "vencidos" o "hasta-<días>". */
  id: string;
  titulo: string;
  tono: "danger" | "warning" | "info";
  items: (T & { dias: number })[];
};

/** «Venció hace 18 días», «Vence hoy», «En 22 días»: el texto de la insignia de cada fila. */
export function etiquetaRelativa(dias: number): string {
  if (dias === 0) return "Vence hoy";
  const n = Math.abs(dias);
  const unidad = n === 1 ? "día" : "días";
  return dias < 0 ? `Venció hace ${n} ${unidad}` : `En ${n} ${unidad}`;
}

/**
 * Reparte los documentos con fecha en «Vencidos» y una banda por ventana: la primera cubre hasta
 * `ventanas[0]` días, la siguiente hasta `ventanas[1]`, etc. Lo que está más allá de la última
 * ventana y lo que no tiene fecha no entra. Los grupos vacíos se omiten y cada grupo sale ordenado
 * por fecha (los más urgentes primero).
 */
export function agruparVencimientos<T extends { venceEn: string | null }>(
  items: readonly T[],
  hoy: string,
  ventanas: readonly number[] = VENTANAS_VENCIMIENTO_DEFECTO,
): GrupoVencimiento<T>[] {
  const orden = [...ventanas].filter((v) => v > 0).sort((a, b) => a - b);
  const grupos: GrupoVencimiento<T>[] = [
    { id: "vencidos", titulo: "Vencidos", tono: "danger", items: [] },
    ...orden.map(
      (v, i): GrupoVencimiento<T> => ({
        id: `hasta-${v}`,
        titulo: `Vencen en ${v} días`,
        tono: i === 0 ? "warning" : "info",
        items: [],
      }),
    ),
  ];
  for (const it of items) {
    if (!it.venceEn) continue;
    const dias = diasHasta(it.venceEn, hoy);
    const banda = dias < 0 ? 0 : orden.findIndex((v) => dias <= v) + 1;
    if (dias >= 0 && banda === 0) continue;
    grupos[banda]?.items.push({ ...it, dias });
  }
  for (const g of grupos) g.items.sort((a, b) => a.dias - b.dias);
  return grupos.filter((g) => g.items.length > 0);
}
