/** Índice numerado de la propuesta técnica: cada bloque con contenido es «N» y sus capítulos por instalación «N.k». */

export type EntradaIndice = { numero: string; titulo: string; nivel: 1 | 2 };

export type ItemIndice = { titulo: string; subtitulos?: readonly string[] };

export function armarIndice(items: readonly ItemIndice[]): EntradaIndice[] {
  return items.flatMap((it, i) => [
    { numero: String(i + 1), titulo: it.titulo, nivel: 1 as const },
    ...(it.subtitulos ?? []).map((t, k) => ({ numero: `${i + 1}.${k + 1}`, titulo: t, nivel: 2 as const })),
  ]);
}

/** Número del bloque `i` (base 0) y del capítulo `k` (base 0) con la misma regla del índice. */
export const numeroBloque = (i: number) => String(i + 1);
export const numeroCapitulo = (i: number, k: number) => `${i + 1}.${k + 1}`;
