import { ejecutarComoUsuario } from "./servidor";

type Pagina<T> = { items: T[]; siguiente: string | null };

/** Recorre todas las páginas de una capacidad de lista CAR-353 (máx. 200 ítems por página). */
export async function listaCompleta<T>(
  portal: string,
  capacidad: string,
  input: Record<string, unknown> = {},
) {
  const acum: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const r = await ejecutarComoUsuario<Pagina<T>>(portal, capacidad, {
      ...input,
      limite: 200,
      ...(cursor ? { cursor } : {}),
    });
    if (!r.ok) return r;
    acum.push(...r.data.items);
    if (!r.data.siguiente) return { ok: true as const, data: acum };
    cursor = r.data.siguiente;
  }
}