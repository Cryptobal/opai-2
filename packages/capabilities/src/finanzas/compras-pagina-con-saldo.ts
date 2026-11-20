export const TAMANO_TRAMO_COMPRAS = 50;

type DocumentoPago = { id: string; tipoDte: number; montoTotal: number };

/** Solo busca la página solicitada y una coincidencia más; no recorre el libro para resumirlo. */
export async function calcularPaginaConSaldo<T extends DocumentoPago>(
  limite: number,
  cursorPagina: string | undefined,
  buscar: (cursor: string | undefined) => Promise<T[]>,
  pagadoPorTramo: (ids: string[]) => Promise<ReadonlyMap<string, number>>,
) {
  const items: T[] = [];
  let cursor = cursorPagina;
  for (;;) {
    const tramo = await buscar(cursor);
    if (!tramo.length) break;
    const candidatos = tramo.filter((d) => d.tipoDte !== 61 && d.montoTotal > 0);
    const pagados = candidatos.length ? await pagadoPorTramo(candidatos.map((d) => d.id)) : undefined;
    for (const d of candidatos) {
      if (d.montoTotal <= (pagados?.get(d.id) ?? 0)) continue;
      if (items.length === limite) return { items, siguiente: items.at(-1)?.id ?? null };
      items.push(d);
    }
    if (tramo.length < TAMANO_TRAMO_COMPRAS) break;
    cursor = tramo.at(-1)?.id;
  }
  return { items, siguiente: null };
}
