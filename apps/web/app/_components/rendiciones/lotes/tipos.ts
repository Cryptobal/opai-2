export type EstadoLote = "borrador" | "aprobado" | "generado" | "pagado" | "anulado" | "aplicado";

export const RUTA_LOTES = "/rendiciones/lotes";

export const ETIQUETA_LOTE: Record<EstadoLote, string> = {
  borrador: "Borrador", aprobado: "Aprobado", generado: "Generado", pagado: "Pagado", anulado: "Anulado", aplicado: "Reversa aplicada",
};
export const TONO_LOTE: Record<EstadoLote, "neutro" | "info" | "success" | "danger" | "warning"> = {
  borrador: "neutro", aprobado: "info", generado: "warning", pagado: "success", anulado: "danger", aplicado: "success",
};

export type CandidataReversa = {
  id: string; codigoVisible: string; descripcion: string; montoTotal: number; solicitanteNombre: string | null;
};

export type Candidata = {
  id: string; codigoVisible: string; descripcion: string; montoTotal: number;
  solicitanteNombre: string | null; conCuenta: boolean; bancoCodigo: string | null; tipoCuenta: string | null;
};

export type LoteResumen = {
  id: string; codigoVisible: string; esReversa: boolean; estado: EstadoLote; totalClp: number; cantidad: number;
  creadoPorId: string; aprobadoPorId: string | null; aprobadoEn: string | null; generadoEn: string | null;
  pagadoEn: string | null; fechaPago: string | null; referenciaPago: string | null; creadoEn: string;
};

export type LoteDetalle = LoteResumen & {
  items: { rendicionId: string; codigoVisible: string; personaNombre: string | null; montoClp: number; descripcion: string }[];
  historial: { tipo: string; actorId: string; estadoHasta: string | null; comentario: string | null; creadoEn: string }[];
};

/** Qué botones ve la persona (visibilidad; las capacidades vuelven a autorizar en servidor). */
export type PermisosLote = { pagar: boolean; aprobar: boolean; configurar: boolean; yoId: string };
