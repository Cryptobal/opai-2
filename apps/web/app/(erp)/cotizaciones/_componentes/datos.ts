import type { EstadoPantalla } from "@opai/ds";

import { accesoCpq } from "@/lib/cpq-ui";
import { estadoPantalla } from "@/lib/formato";
import { esUuid } from "@/lib/ids";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { ParametrosVersion } from "../[id]/_componentes/margen-form";
import type { LineaEditable } from "./puesto-tipos";

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
        /** Falso si el cálculo guardado es antiguo o dudoso: se pide recalcular en vez de mostrar un margen. */
        calculoConfiable: boolean;
      }
    | undefined;
  /** El mismo estado único de la ficha; null si el cálculo guardado no basta para decidirlo. */
  estadoFicha: { estado: string; etiqueta: string } | null;
  version: {
    numero: number;
    estado: string;
    validaHasta: string | null;
    ventaMensualClp: number | null;
  } | null;
};
export type ListaCotizaciones = { items: CotizacionFila[]; siguiente: string | null };
export type DatosCotizaciones = ListaCotizaciones & {
  /** Lista de «Archivadas» (CPQ v4): se pide con `?ver=archivadas`. */
  archivadas?: boolean;
  state: EstadoPantalla;
  crear: boolean;
  costos: boolean;
};

/** Lista paginada; costos y margen solo con `cpq:costos.ver`. */
export async function cargarCotizaciones(
  cursor?: string,
  negocioId?: string,
  archivadas = false,
): Promise<DatosCotizaciones> {
  const acceso = accesoCpq(await identidadActual());
  if (!acceso.leer) {
    return { state: "forbidden", items: [], siguiente: null, crear: false, costos: false };
  }
  const r = await ejecutarComoUsuario<ListaCotizaciones>("erp", "cpq.cotizaciones.list", {
    limite: 20,
    ...(cursor && esUuid(cursor) ? { cursor } : {}),
    ...(negocioId ? { negocioId } : {}),
    ...(archivadas ? { soloArchivadas: true } : {}),
  });
  return {
    archivadas,
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
          estadoFicha: c.estadoFicha,
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
      confirmarPuestos: false,
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
    version: { id: string; editable: boolean; estado: string; validaHasta: string | null; numero: number };
    /** Solo con `cpq:costos.ver`. */
    parametros?: ParametrosVersion;
    secciones: {
      id: string;
      nombre: string;
      instalacionId?: string | null;
      lineas: (LineaEditable & { tipo: string; costo?: unknown })[];
    }[];
  };
  const r = await ejecutarComoUsuario<FichaRespuesta>("erp", "cpq.cotizaciones.ficha", { id });
  if (!r.ok) {
    return {
      state: estadoPantalla(r),
      gestionar: false,
      aprobar: false,
      aprobarEnvios: false,
      confirmarPuestos: false,
      costos: acceso.costos,
      ficha: null,
      versiones: [],
    };
  }
  // Abrir la ficha solo lee (CAR-231). Antes, con una versión editable que NO estaba desactualizada, la
  // carga ejecutaba `cpq.cotizaciones.calcular` (una escritura auditada) en cada entrada o precarga, y no
  // lo hacía si estaba desactualizada: el cálculo guardado cambiaba según el estado y el momento. La
  // ficha ya trae el cálculo proyectado; el guardado se actualiza con cada edición y con «Recalcular».
  const ficha = r.data;
  const get = await ejecutarComoUsuario<{
    versiones: { numero: number; estado: string; enviadaEn: Date | null; ventaMensualClp: number | null }[];
  }>("erp", "cpq.cotizaciones.get", { id });
  return {
    state: "ready" as const,
    gestionar: acceso.crear,
    aprobar: acceso.aprobar,
    aprobarEnvios: acceso.aprobarEnvios,
    confirmarPuestos: acceso.confirmarPuestos,
    costos: acceso.costos,
    ficha,
    versiones: get.ok ? get.data.versiones : [],
  };
}
