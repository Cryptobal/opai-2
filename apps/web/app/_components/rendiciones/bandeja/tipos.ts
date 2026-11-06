import type { DetalleRendicion, EstadoRendicion, ResumenRendicion } from "../tipos";

export type FilaBandeja = ResumenRendicion & { solicitanteId: string; solicitanteNombre: string | null };

export type Bandeja = {
  rendiciones: FilaBandeja[];
  porRevisar: number;
  montoPorRevisar: number;
  aprobadasSinPagar: number;
};

export type DetalleBandeja = { rendicion: DetalleRendicion & { solicitanteId: string }; solicitanteNombre: string | null };

export type EstadoBandeja = Extract<EstadoRendicion, "enviada" | "aprobada" | "devuelta" | "rechazada">;

export const FILTROS_ESTADO: readonly { id: EstadoBandeja; etiqueta: string }[] = [
  { id: "enviada", etiqueta: "Por revisar" },
  { id: "aprobada", etiqueta: "Aprobadas" },
  { id: "devuelta", etiqueta: "Devueltas" },
  { id: "rechazada", etiqueta: "Rechazadas" },
];

export type FiltrosBandeja = { estado: EstadoBandeja; solicitanteId?: string; desde?: string; hasta?: string };

export const RUTA_BANDEJA = "/rendiciones/bandeja";

/** Lee los filtros de la URL; lo que no es válido se ignora (nunca llega a la capacidad). */
export function filtrosDe(q: Record<string, string | string[] | undefined>): FiltrosBandeja {
  const uno = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  const estado = FILTROS_ESTADO.find((f) => f.id === uno("estado"))?.id ?? "enviada";
  const fecha = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const sol = uno("solicitante");
  return {
    estado,
    ...(sol && /^[0-9a-f-]{36}$/i.test(sol) ? { solicitanteId: sol } : {}),
    ...(fecha(uno("desde")) ? { desde: fecha(uno("desde"))! } : {}),
    ...(fecha(uno("hasta")) ? { hasta: fecha(uno("hasta"))! } : {}),
  };
}

export function hrefBandeja(f: FiltrosBandeja, id?: string): string {
  const p = new URLSearchParams();
  if (f.estado !== "enviada") p.set("estado", f.estado);
  if (f.solicitanteId) p.set("solicitante", f.solicitanteId);
  if (f.desde) p.set("desde", f.desde);
  if (f.hasta) p.set("hasta", f.hasta);
  const q = p.toString();
  return `${RUTA_BANDEJA}${id ? `/${id}` : ""}${q ? `?${q}` : ""}`;
}
