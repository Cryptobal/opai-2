import type { EstadoPantalla } from "@opai/ds";

import { accesoCpq } from "@/lib/cpq-ui";
import { estadoPantalla } from "@/lib/formato";
import { esUuid } from "@/lib/ids";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

export type CotizacionFila = {
  id: string;
  codigo: string;
  titulo: string;
  negocioId: string;
  negocioTitulo: string | null;
  vigente: boolean;
  alternativaDeId: string | null;
  version: {
    numero: number;
    estado: string;
    validaHasta: string | null;
    ventaMensualClp: number | null;
  } | null;
};
export type ListaCotizaciones = { items: CotizacionFila[]; siguiente: string | null };
export type DatosCotizaciones = ListaCotizaciones & { state: EstadoPantalla; crear: boolean };

/** No se serializan costos ni margen en estas pantallas; la capacidad ya los filtra por permiso. */
export async function cargarCotizaciones(
  cursor?: string,
  negocioId?: string,
): Promise<DatosCotizaciones> {
  const acceso = accesoCpq(await identidadActual());
  if (!acceso.leer) return { state: "forbidden", items: [], siguiente: null, crear: false };
  const r = await ejecutarComoUsuario<ListaCotizaciones>("erp", "cpq.cotizaciones.list", {
    limite: 20,
    ...(cursor && esUuid(cursor) ? { cursor } : {}),
    ...(negocioId ? { negocioId } : {}),
  });
  return {
    state: estadoPantalla(r),
    crear: acceso.crear,
    siguiente: r.ok ? r.data.siguiente : null,
    items: r.ok
      ? r.data.items.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          titulo: c.titulo,
          negocioId: c.negocioId,
          negocioTitulo: c.negocioTitulo,
          vigente: c.vigente,
          alternativaDeId: c.alternativaDeId,
          version: c.version
            ? {
                numero: c.version.numero,
                estado: c.version.estado,
                validaHasta: c.version.validaHasta,
                ventaMensualClp: c.version.ventaMensualClp,
              }
            : null,
        }))
      : [],
  };
}
