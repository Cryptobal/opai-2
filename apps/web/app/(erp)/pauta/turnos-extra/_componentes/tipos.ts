export type TurnoExtra = {
  id: string;
  puestoId: string;
  fecha: string;
  personaId: string;
  excepcionId: string;
  tipoTrabajador: "propio" | "externo";
  montoClp: number;
  montoMotivo: string | null;
  montoOrigen: "puesto" | "instalacion" | "manual" | "sin_tarifa";
  estado: "por_aprobar" | "aprobado" | "rechazado";
  registradoPor: string | null;
  resueltoPor: string | null;
  resueltoEn: string | null;
  motivoResolucion: string | null;
};

export type TurnoExtraFila = TurnoExtra & {
  personaNombre: string;
  puestoNombre: string;
  instalacionNombre: string;
};

export const RUTA_TURNOS_EXTRA = "/pauta/turnos-extra";

export const ESTADOS = [
  { id: "por_aprobar", etiqueta: "Por aprobar" },
  { id: "aprobado", etiqueta: "Aprobados" },
  { id: "rechazado", etiqueta: "Rechazados" },
] as const;

export function hrefTurnosExtra(p: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  if (p.estado) q.set("estado", p.estado);
  if (p.inst) q.set("inst", p.inst);
  if (p.ver) q.set("ver", p.ver);
  const s = q.toString();
  return s ? `${RUTA_TURNOS_EXTRA}?${s}` : RUTA_TURNOS_EXTRA;
}