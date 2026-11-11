import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { EnvioCliente } from "./historial-envios";
import type { LineaBorrador, Venta } from "./tipos";

export type DetalleVenta = Venta & {
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoCobrado: number;
  montoPendiente: number;
  cesionProveedor: string | null;
  /** A quién se cedió (factor); Octava es solo el integrador y no se muestra. */
  cesionFactor: string | null;
  glosa: string | null;
  lineas: LineaBorrador[];
  trackIdSii: string | null;
};

/** Ficha de una venta (borrador o emitida) con su historial de envíos; la misma capacidad que usaba la página completa. */
export async function cargarFichaVenta(id: string) {
  await requerirIdentidad(`/finanzas/ventas/${id}`);
  const r = await ejecutarComoUsuario<DetalleVenta>("erp", "finanzas.ventas.obtener", { documentoId: id });
  const e = r.ok
    ? await ejecutarComoUsuario<{ envios: EnvioCliente[] }>("erp", "finanzas.ventas.envios", { documentoId: id })
    : null;
  return { state: estadoPantalla(r), venta: r.ok ? r.data : null, envios: e?.ok ? e.data.envios : [] };
}
