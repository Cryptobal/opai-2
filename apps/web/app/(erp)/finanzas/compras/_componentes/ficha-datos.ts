import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { Compra } from "../../_componentes/tipos";

/** Un documento del libro de compras para el panel derecho (CAR-256, `finanzas.compras.get`). */
export async function cargarFichaCompra(id: string) {
  await requerirIdentidad(`/finanzas/compras/${id}`);
  const r = await ejecutarComoUsuario<Compra>("erp", "finanzas.compras.get", { id });
  return { state: estadoPantalla(r), compra: r.ok ? r.data : null };
}
