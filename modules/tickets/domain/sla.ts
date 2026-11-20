import { ESTADOS_VIVOS, type EstadoTicket } from "./index";

/** Primeros 8 caracteres del UUID, en mayúsculas: número visible del ticket en la bandeja. */
export function numeroTicket(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** Vencimiento del SLA a partir de la hora de creación y las horas del tipo (null si el tipo no tiene SLA). */
export function slaVenceEnDesde(creacion: Date, slaHoras: number | null): Date | null {
  if (slaHoras == null || slaHoras <= 0) return null;
  return new Date(creacion.getTime() + slaHoras * 3_600_000);
}

export type TicketSla = {
  estado: EstadoTicket;
  slaVenceEn: Date | null;
};

/** El SLA ya venció, el ticket sigue vivo y aún no se registró el aviso. */
export function debeAvisarSlaVencido(t: TicketSla, ahora: Date, yaAvisado: boolean): boolean {
  if (yaAvisado || !t.slaVenceEn) return false;
  if (!ESTADOS_VIVOS.includes(t.estado)) return false;
  return ahora.getTime() >= t.slaVenceEn.getTime();
}