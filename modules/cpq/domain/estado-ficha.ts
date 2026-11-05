// Estado único de la ficha de cotización (CAR-192). Una sola función pura decide qué estado ve la
// persona y cuál es su único siguiente paso; la usan el chip, la lista de pendientes y las
// capacidades `marcar_lista` y enviar. Nunca devuelve dos estados a la vez.
import type { EstadoCotizacion } from "./index";

export type EntradaEstadoFicha = {
  /** Estado persistido de la versión. */
  estado: EstadoCotizacion;
  /** Hay al menos un puesto o ítem habilitado. */
  hayLineas: boolean;
  /** Faltan costos, UF u otros datos para calcular (`noEnviable` del motor). */
  costosPendientes: boolean;
  /** Los valores legales cambiaron desde el último cálculo guardado (huella distinta). */
  desactualizada: boolean;
  /** El margen quedó bajo el mínimo o la cotización está subvalorada (`requiereAprobacion`). */
  margenBajo: boolean;
};

export type CodigoBloqueo = "sin_lineas" | "costos_pendientes" | "desactualizada" | "margen_bajo";
export type Bloqueo = { codigo: CodigoBloqueo; mensaje: string };

export type EstadoFicha =
  | "incompleta"
  | "desactualizada"
  | "margen_bajo"
  | "por_dejar_lista"
  | "en_aprobacion"
  | "lista_para_enviar"
  | "enviada"
  | "aceptada"
  | "rechazada"
  | "vencida"
  | "reemplazada"
  | "archivada";

export type AccionSiguiente =
  | "completar"
  | "recalcular"
  | "pedir_aprobacion"
  | "dejar_lista"
  | "esperar"
  | "enviar"
  | "ninguna";

export type SalidaEstadoFicha = {
  estado: EstadoFicha;
  etiqueta: string;
  siguiente: { accion: AccionSiguiente; etiqueta: string };
  bloqueos: Bloqueo[];
};

export const MENSAJE_BLOQUEO: Record<CodigoBloqueo, string> = {
  sin_lineas: "Agrega al menos un puesto antes de dejar la cotización lista.",
  costos_pendientes: "Faltan costos o datos para calcular: completa lo pendiente.",
  desactualizada: "Los valores legales cambiaron desde el último cálculo: recalcula antes de continuar.",
  margen_bajo: "El margen quedó bajo el mínimo: pide aprobación antes de dejarla lista.",
};

/** Lo que impide dejar lista una versión en borrador, en el orden en que se resuelve. */
export function bloqueosParaLista(e: Omit<EntradaEstadoFicha, "estado">): Bloqueo[] {
  const lista: CodigoBloqueo[] = [];
  if (!e.hayLineas) lista.push("sin_lineas");
  if (e.costosPendientes) lista.push("costos_pendientes");
  if (e.desactualizada) lista.push("desactualizada");
  if (e.margenBajo) lista.push("margen_bajo");
  return lista.map((codigo) => ({ codigo, mensaje: MENSAJE_BLOQUEO[codigo] }));
}

const FIJOS: Partial<Record<EstadoCotizacion, SalidaEstadoFicha>> = {
  en_aprobacion: {
    estado: "en_aprobacion",
    etiqueta: "En aprobación",
    siguiente: { accion: "esperar", etiqueta: "Esperando la decisión" },
    bloqueos: [],
  },
  lista: {
    estado: "lista_para_enviar",
    etiqueta: "Lista para enviar",
    siguiente: { accion: "enviar", etiqueta: "Enviar al contacto" },
    bloqueos: [],
  },
  enviada: { estado: "enviada", etiqueta: "Enviada", siguiente: { accion: "ninguna", etiqueta: "" }, bloqueos: [] },
  aceptada: { estado: "aceptada", etiqueta: "Aceptada", siguiente: { accion: "ninguna", etiqueta: "" }, bloqueos: [] },
  rechazada: { estado: "rechazada", etiqueta: "Rechazada", siguiente: { accion: "ninguna", etiqueta: "" }, bloqueos: [] },
  vencida: { estado: "vencida", etiqueta: "Vencida", siguiente: { accion: "ninguna", etiqueta: "" }, bloqueos: [] },
  reemplazada: { estado: "reemplazada", etiqueta: "Reemplazada", siguiente: { accion: "ninguna", etiqueta: "" }, bloqueos: [] },
  archivada: { estado: "archivada", etiqueta: "Archivada", siguiente: { accion: "ninguna", etiqueta: "" }, bloqueos: [] },
};

const POR_BLOQUEO: Record<CodigoBloqueo, Omit<SalidaEstadoFicha, "bloqueos">> = {
  sin_lineas: {
    estado: "incompleta",
    etiqueta: "Incompleta",
    siguiente: { accion: "completar", etiqueta: "Completar los datos" },
  },
  costos_pendientes: {
    estado: "incompleta",
    etiqueta: "Incompleta",
    siguiente: { accion: "completar", etiqueta: "Completar los datos" },
  },
  desactualizada: {
    estado: "desactualizada",
    etiqueta: "Desactualizada",
    siguiente: { accion: "recalcular", etiqueta: "Recalcular" },
  },
  margen_bajo: {
    estado: "margen_bajo",
    etiqueta: "Margen bajo",
    siguiente: { accion: "pedir_aprobacion", etiqueta: "Pedir aprobación" },
  },
};

/**
 * Un solo estado y un solo siguiente paso. En borrador manda el primer bloqueo (incompleta →
 * desactualizada → margen bajo → lista para dejar lista). Desde `en_aprobacion` en adelante el
 * estado es el persistido: una versión aprobada no vuelve a pedir aprobación ni a mostrar «bajo el
 * mínimo» porque no se recalcula (queda congelada).
 */
export function estadoFicha(e: EntradaEstadoFicha): SalidaEstadoFicha {
  const fijo = FIJOS[e.estado];
  if (fijo) return fijo;
  const bloqueos = bloqueosParaLista(e);
  const primero = bloqueos[0];
  if (primero) return { ...POR_BLOQUEO[primero.codigo], bloqueos };
  return {
    estado: "por_dejar_lista",
    etiqueta: "Por dejar lista",
    siguiente: { accion: "dejar_lista", etiqueta: "Dejar lista" },
    bloqueos: [],
  };
}

/** `lista` y posteriores se muestran congeladas: la ficha no recalcula. */
export function esCongelada(estado: EstadoCotizacion): boolean {
  return estado !== "borrador" && estado !== "en_aprobacion" && estado !== "archivada";
}

/** Editar exige borrador; desde `lista` se pide «Reabrir para editar». */
export function sePuedeReabrir(estado: EstadoCotizacion): boolean {
  return estado === "lista";
}

/** Una versión nueva solo cuando la última ya salió y no hay otra editable (índice único). */
export function sePuedeCrearVersionNueva(estado: EstadoCotizacion): boolean {
  return !["borrador", "en_aprobacion", "lista", "archivada"].includes(estado);
}
