import { z } from "zod";

import { conflicto } from "@opai/capabilities";

import { ESTADOS_TICKET, PRIORIDADES_TICKET } from "../domain";

/** Traduce la violación de un índice único (carrera entre dos escrituras) a CONFLICT. */
export async function sinDuplicado<T>(p: Promise<T>, mensaje: string): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === "P2002") throw conflicto(mensaje);
    throw e;
  }
}

/** Esquemas y utilidades compartidas por las capacidades de Tickets (ADR-004). */
export const uuidSchema = z.uuid();
export const estadoSchema = z.enum(ESTADOS_TICKET);
export const prioridadSchema = z.enum(PRIORIDADES_TICKET);

export const listaSchema = z.object({
  cursor: uuidSchema.optional().describe("Id de la última fila de la página anterior."),
  limite: z.number().int().min(1).max(100).default(50),
});

export function pagina<T extends { id: string }>(filas: T[], limite: number) {
  const items = filas.slice(0, limite);
  return { items, siguiente: filas.length > limite ? (items.at(-1)?.id ?? null) : null };
}

export const cursorDe = (cursor?: string) => (cursor ? { cursor: { id: cursor }, skip: 1 } : {});

export const tipoSchema = z.object({
  id: uuidSchema,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  responsableDefectoTipo: z.enum(["rol", "usuario"]),
  responsableDefectoRol: z.string().nullable(),
  responsableDefectoUsuarioId: uuidSchema.nullable(),
  requiereAprobacion: z.boolean(),
  aprobadorRol: z.string().nullable(),
  slaHoras: z.number().int().nullable(),
  rolesPermitidos: z.array(z.string()),
  activo: z.boolean(),
  orden: z.number().int(),
});

type FilaTipo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  responsableDefectoTipo: string;
  responsableDefectoRol: string | null;
  responsableDefectoUsuarioId: string | null;
  requiereAprobacion: boolean;
  aprobadorRol: string | null;
  slaHoras: number | null;
  rolesPermitidos: string[];
  activo: boolean;
  orden: number;
};

export function vistaTipo(t: FilaTipo): z.infer<typeof tipoSchema> {
  return {
    id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion,
    responsableDefectoTipo: t.responsableDefectoTipo === "usuario" ? "usuario" : "rol",
    responsableDefectoRol: t.responsableDefectoRol,
    responsableDefectoUsuarioId: t.responsableDefectoUsuarioId,
    requiereAprobacion: t.requiereAprobacion,
    aprobadorRol: t.aprobadorRol,
    slaHoras: t.slaHoras,
    rolesPermitidos: t.rolesPermitidos,
    activo: t.activo,
    orden: t.orden,
  };
}

export const ticketSchema = z.object({
  id: uuidSchema,
  tipoId: uuidSchema,
  tipoNombre: z.string(),
  tipoRequiereAprobacion: z.boolean(),
  titulo: z.string(),
  descripcion: z.string(),
  prioridad: prioridadSchema,
  estado: estadoSchema,
  solicitanteId: uuidSchema,
  responsableId: uuidSchema,
  motivoRechazo: z.string().nullable(),
  slaVenceEn: z.date().nullable(),
  resueltoEn: z.date().nullable(),
  cerradoEn: z.date().nullable(),
  createdAt: z.date(),
});

export const eventoSchema = z.object({
  id: uuidSchema,
  tipo: z.string(),
  actorId: uuidSchema,
  comentario: z.string().nullable(),
  estadoDesde: z.string().nullable(),
  estadoHasta: z.string().nullable(),
  createdAt: z.date(),
});
