import type { ItemTimeline } from "@opai/ds";

import { fecha, hora } from "@/lib/fechas";

import { type ActividadVista, RESULTADO } from "./tipos";

const cita = (t: string | null) => (t ? ` · «${t.length > 140 ? `${t.slice(0, 140)}…` : t}»` : "");

/** Frase de la línea de tiempo para lo registrado a mano («registró una llamada… · contestó»). */
export function fraseActividad(a: ActividadVista): string {
  const con = a.vinculosDetalle.find((v) => v.tipo === "contacto")?.nombre;
  switch (a.tipo) {
    case "tarea": {
      const estado = a.estado === "hecha" ? " · hecha" : a.estado === "cancelada" ? " · cancelada" : "";
      return `creó la tarea «${a.titulo}»${a.vencimiento ? ` · vence el ${fecha(a.vencimiento)}` : ""}${estado}`;
    }
    case "llamada":
      return `registró una llamada${con ? ` con ${con}` : ""}${a.resultado ? ` · ${RESULTADO[a.resultado]}` : ""}${cita(a.titulo)}`;
    case "reunion":
      return `registró una reunión${cita(a.titulo)}${a.acuerdos ? " · con acuerdos" : ""}`;
    case "correo":
      return `registró un correo${con ? ` con ${con}` : ""}${cita(a.titulo)}`;
    case "whatsapp":
      return `registró un WhatsApp${cita(a.titulo)}`;
    case "visita":
      return `registró una visita${cita(a.titulo)}`;
    default:
      return `dejó una nota${cita(a.titulo)}`;
  }
}

export const cuandoTimeline = (iso: string) => `${fecha(iso)} · ${hora(iso)}`;

/** Ítem de Timeline para una actividad registrada. */
export function itemActividad(a: ActividadVista): ItemTimeline & { orden: string } {
  return {
    id: a.id,
    orden: a.ocurrioEn,
    actor: { nombre: a.creadaPorNombre ?? "OPAI", agente: !a.creadaPorNombre },
    accion: fraseActividad(a),
    cuando: cuandoTimeline(a.ocurrioEn),
    ...(a.acuerdos ? { meta: `Acuerdos: ${a.acuerdos}` } : {}),
  };
}
