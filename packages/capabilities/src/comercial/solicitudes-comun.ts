import { z } from "zod";

import { noEncontrado } from "../errores";
import { externo } from "../externo";
import { uuidSchema } from "../core/esquemas";
import type { Contexto } from "../types";
import {
  CANALES_SOLICITUD,
  ESTADOS_SOLICITUD,
  type AccionSolicitud,
  type EstadoSolicitud,
  motivoRechazo,
  puede,
} from "./solicitudes-dominio";
import { reglaDeNegocio } from "../errores";

export const PERMISO_SOLICITUDES_READ = "comercial:solicitudes.read";
export const PERMISO_SOLICITUDES_MANAGE = "comercial:solicitudes.manage";
export const PERMISO_CANALES = "comercial:canales.manage";

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const ext = () => externo(z.string()).nullable();

/**
 * Una solicitud tal como la devuelven las capacidades. Todo lo que escribió un tercero (texto,
 * asunto y datos propuestos) va marcado como externo: es dato, nunca instrucción ni enlace.
 */
export const solicitudSchema = z.object({
  id: z.string(),
  canal: z.enum(CANALES_SOLICITUD),
  estado: z.enum(ESTADOS_SOLICITUD),
  textoOriginal: externo(z.string()),
  asunto: ext(),
  nombre: ext(),
  empresa: ext(),
  email: ext(),
  telefono: ext(),
  rut: ext(),
  comuna: ext(),
  servicio: ext(),
  fuente: ext(),
  notasAgente: z.string().nullable(),
  camposPropuestosAgente: z.array(z.string()),
  responsableId: z.string().nullable(),
  registradaPorTipo: z.string(),
  registradaPorId: z.string().nullable(),
  motivoDescarte: z.string().nullable(),
  descartadaEn: z.string().nullable(),
  convertidaEn: z.string().nullable(),
  duplicadaDeId: z.string().nullable(),
  negocioId: z.string().nullable(),
  cuentaId: z.string().nullable(),
  contactoId: z.string().nullable(),
  creadaEn: z.string(),
});

type Fila = {
  id: string;
  canal: string;
  estado: string;
  textoOriginal: string;
  asunto: string | null;
  nombre: string | null;
  empresa: string | null;
  email: string | null;
  telefono: string | null;
  rut: string | null;
  comuna: string | null;
  servicio: string | null;
  fuente: string | null;
  notasAgente: string | null;
  camposPropuestosAgente: string[];
  responsableId: string | null;
  registradaPorTipo: string;
  registradaPorId: string | null;
  motivoDescarte: string | null;
  descartadaEn: Date | null;
  convertidaEn: Date | null;
  duplicadaDeId: string | null;
  negocioId: string | null;
  cuentaId: string | null;
  contactoId: string | null;
  createdAt: Date;
};

export function vistaSolicitud(s: Fila): z.input<typeof solicitudSchema> {
  return {
    id: s.id,
    canal: s.canal as (typeof CANALES_SOLICITUD)[number],
    estado: s.estado as EstadoSolicitud,
    textoOriginal: s.textoOriginal,
    asunto: s.asunto,
    nombre: s.nombre,
    empresa: s.empresa,
    email: s.email,
    telefono: s.telefono,
    rut: s.rut,
    comuna: s.comuna,
    servicio: s.servicio,
    fuente: s.fuente,
    notasAgente: s.notasAgente,
    camposPropuestosAgente: s.camposPropuestosAgente ?? [],
    responsableId: s.responsableId,
    registradaPorTipo: s.registradaPorTipo,
    registradaPorId: s.registradaPorId,
    motivoDescarte: s.motivoDescarte,
    descartadaEn: iso(s.descartadaEn),
    convertidaEn: iso(s.convertidaEn),
    duplicadaDeId: s.duplicadaDeId,
    negocioId: s.negocioId,
    cuentaId: s.cuentaId,
    contactoId: s.contactoId,
    creadaEn: s.createdAt.toISOString(),
  };
}

export const idSolicitud = z.object({ id: uuidSchema });

/** Busca una solicitud del tenant o lanza NOT_FOUND. */
export async function solicitudDe(ctx: Contexto, id: string) {
  const s = await ctx.db.solicitud.findUnique({ where: { id } });
  if (!s) throw noEncontrado("La solicitud");
  return s;
}

/** Exige que la acción corresponda al estado actual (R3, R4, R5). */
export function exigirPuede(estado: string, accion: AccionSolicitud) {
  if (!puede(estado as EstadoSolicitud, accion))
    throw reglaDeNegocio(motivoRechazo(estado as EstadoSolicitud, accion));
}
