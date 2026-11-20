/** Recorre páginas CAR-353 a partir de una lectura que devuelve `{ items, siguiente }`. */
export async function acumularPaginas<T>(
  pedir: (extra: { limite: number; cursor?: string }) => Promise<
    | { ok: true; data: { items: T[]; siguiente: string | null } }
    | { ok: false }
  >,
) {
  const acum: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const r = await pedir({ limite: 200, ...(cursor ? { cursor } : {}) });
    if (!r.ok) return r;
    acum.push(...r.data.items);
    if (!r.data.siguiente) return { ok: true as const, data: acum };
    cursor = r.data.siguiente;
  }
}