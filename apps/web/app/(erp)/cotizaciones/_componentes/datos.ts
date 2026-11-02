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
  cuentaTitulo: string | null;
  vigente: boolean;
  alternativaDeId: string | null;
  resumenCalculo?:
    | {
        semaforo?: "verde" | "amarillo" | "rojo";
        margenEfectivoPct?: number;
        costoPendiente: boolean;
      }
    | undefined;
  version: {
    numero: number;
    estado: string;
    validaHasta: string | null;
    ventaMensualClp: number | null;
  } | null;
};
export type ListaCotizaciones = { items: CotizacionFila[]; siguiente: string | null };
export type DatosCotizaciones = ListaCotizaciones & {
  state: EstadoPantalla;
  crear: boolean;
  costos: boolean;
};

/** Lista paginada; costos y margen solo con `cpq:costos.ver`. */
export async function cargarCotizaciones(
  cursor?: string,
  negocioId?: string,
): Promise<DatosCotizaciones> {
  const acceso = accesoCpq(await identidadActual());
  if (!acceso.leer) {
    return { state: "forbidden", items: [], siguiente: null, crear: false, costos: false };
  }
  const r = await ejecutarComoUsuario<ListaCotizaciones>("erp", "cpq.cotizaciones.list", {
    limite: 20,
    ...(cursor && esUuid(cursor) ? { cursor } : {}),
    ...(negocioId ? { negocioId } : {}),
  });
  return {
    state: estadoPantalla(r),
    crear: acceso.crear,
    costos: acceso.costos,
    siguiente: r.ok ? r.data.siguiente : null,
    items: r.ok
      ? r.data.items.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          titulo: c.titulo,
          negocioId: c.negocioId,
          negocioTitulo: c.negocioTitulo,
          cuentaTitulo: c.cuentaTitulo ?? null,
          vigente: c.vigente,
          alternativaDeId: c.alternativaDeId,
          resumenCalculo: c.resumenCalculo ?? undefined,
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

export type DatosFichaCotizacion = Awaited<ReturnType<typeof cargarFichaCotizacion>>;

/** Ficha completa para el panel derecho (lista + detalle). */
export async function cargarFichaCotizacion(id: string) {
  const acceso = accesoCpq(await identidadActual());
  if (!acceso.leer) {
    return {
      state: "forbidden" as const,
      gestionar: false,
      aprobar: false,
      aprobarEnvios: false,
      costos: false,
      ficha: null,
      versiones: [] as { numero: number; estado: string; enviadaEn: Date | null }[],
    };
  }
  type FichaRespuesta = {
    cotizacion: { id: string; codigo: string; titulo: string; negocioId: string; vigente: boolean };
    negocioTitulo: string | null;
    cuentaId: string | null;
    meta?: Record<string, unknown>;
    calculo: Record<string, unknown>;
    version: { editable: boolean; estado: string; validaHasta: string | null; numero: number };
    secciones: {
      id: string;
      nombre: string;
      lineas: { id: string; nombre: string; tipo: string; costo?: unknown; posiciones?: number }[];
    }[];
  };
  const r = await ejecutarComoUsuario<FichaRespuesta>("erp", "cpq.cotizaciones.ficha", { id });
  if (!r.ok) {
    return {
      state: estadoPantalla(r),
      gestionar: false,
      aprobar: false,
      aprobarEnvios: false,
      costos: acceso.costos,
      ficha: null,
      versiones: [],
    };
  }
  let ficha = r.data;
  if (acceso.crear && ficha.version.editable) {
    await ejecutarComoUsuario("erp", "cpq.cotizaciones.calcular", { id }, false);
    const r2 = await ejecutarComoUsuario<FichaRespuesta>("erp", "cpq.cotizaciones.ficha", { id });
    if (r2.ok) ficha = r2.data;
  }
  const get = await ejecutarComoUsuario<{
    versiones: { numero: number; estado: string; enviadaEn: Date | null; ventaMensualClp: number | null }[];
  }>("erp", "cpq.cotizaciones.get", { id });
  return {
    state: "ready" as const,
    gestionar: acceso.crear,
    aprobar: acceso.aprobar,
    aprobarEnvios: acceso.aprobarEnvios,
    costos: acceso.costos,
    ficha,
    versiones: get.ok ? get.data.versiones : [],
  };
}
