import type { Resultado } from "@opai/capabilities";

import { ejecutarComoUsuario } from "@/lib/servidor";
import type { CuentaFila, Pagina } from "@/lib/tipos-maestros";

/** Máximo de páginas que se recorren (100 cuentas por página, el tope de `core.cuentas.list`). */
const MAX_PAGINAS = 20;

/**
 * Trae las cuentas de la empresa siguiendo el cursor de `core.cuentas.list`. El tope por página es 100: pedir
 * más devuelve INVALID_INPUT y la pantalla quedaba sin clientes. Si una página falla, devuelve ese error.
 */
export async function cuentasPaginadas(filtro: {
  estado?: "cliente_activo";
}): Promise<Resultado<Pagina<CuentaFila>>> {
  const items: CuentaFila[] = [];
  let cursor: string | undefined;
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
    const r = await ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", {
      limite: 100,
      ...filtro,
      ...(cursor ? { cursor } : {}),
    });
    if (!r.ok) return r;
    items.push(...r.data.items);
    cursor = r.data.siguiente ?? undefined;
    if (!cursor) break;
  }
  return { ok: true, data: { items, siguiente: cursor ?? null }, dryRun: false };
}
