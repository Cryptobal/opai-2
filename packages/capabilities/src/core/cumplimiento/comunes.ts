import { z } from "zod";

import { TITULARES } from "@opai/domain";

import type { TenantTx } from "@opai/db";

import { conflicto, noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeContacto, dondePersona } from "../maestros/alcance";
import { dondeSolicitud } from "./solicitudes-alcance";

/** Titular de los datos: persona (trabajador) o contacto de una cuenta (§4.1). */
export const titularSchema = z.object({
  tipo: z.enum(TITULARES).describe('Tipo de titular: "persona" o "contacto".'),
  id: uuidSchema.describe("Id de la persona o del contacto en el tenant."),
});
export type Titular = z.output<typeof titularSchema>;

export type TitularVista = { tipo: string; id: string; nombre: string; email: string | null };

/** Nombre y correo legible de quien ejecuta, como prueba (sin FK, igual que audit_events). */
export const actorLegible = (ctx: Contexto): string | null =>
  ctx.usuario ? `${ctx.usuario.nombre} <${ctx.usuario.email}>` : null;

/**
 * Carga el titular dentro del tenant (RLS impide ver los de otro). NOT_FOUND si no existe: el
 * alcance se aplica en la consulta, nunca por id a secas (ADR-022). Lo usan consentimientos,
 * solicitudes y la exportación para no confiar en el id del input.
 */
export async function cargarTitular(ctx: Contexto, t: Titular): Promise<TitularVista> {
  if (t.tipo === "persona") {
    const p = await ctx.db.persona.findFirst({ where: { id: t.id, ...dondePersona(ctx) } });
    if (!p) throw noEncontrado("El titular (persona)");
    return {
      tipo: "persona",
      id: p.id,
      nombre: `${p.nombres} ${p.apellidos}`.trim(),
      email: p.emailLaboral ?? p.emailPersonal ?? null,
    };
  }
  const c = await ctx.db.contacto.findFirst({ where: { id: t.id, ...dondeContacto(ctx) } });
  if (!c) throw noEncontrado("El titular (contacto)");
  return {
    tipo: "contacto",
    id: c.id,
    nombre: `${c.nombres} ${c.apellidos}`.trim(),
    email: c.email ?? null,
  };
}

/**
 * Valida que un documento de evidencia exista en el tenant actual: la RLS impide ver los de otro,
 * así que `findUnique` devuelve null tanto si no existe como si es de otro tenant, y en ambos casos
 * se responde «no encontrado» sin revelar cuál de las dos cosas es (sin enumeración). Evita apuntar
 * la evidencia a un documento ajeno (los campos `*_doc_id` / `documento_evidencia_id` no tienen FK;
 * las referencias entre tablas son del mismo tenant). Recibe el cliente (db o tx) para validar
 * dentro de la misma transacción.
 */
export async function validarEvidenciaDelTenant(
  db: TenantTx,
  docId: string | undefined,
): Promise<void> {
  if (!docId) return;
  const d = await db.documento.findUnique({ where: { id: docId } });
  if (!d) throw noEncontrado("El documento de evidencia");
}

/** Fila de solicitud tal como la devuelven las capacidades (fechas como ISO). */
export type FilaSolicitud = {
  id: string;
  tipo: string;
  estado: string;
  titularTipo: string | null;
  titularId: string | null;
  titularEmail: string | null;
  titularNombre: string | null;
  plazoEn: Date | null;
  recibidaEn: Date;
  responsableId: string | null;
  resultado: string | null;
  documentoEvidenciaId: string | null;
};

export const solicitudSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  estado: z.string(),
  titular: z.object({
    tipo: z.string().nullable(),
    id: z.string().nullable(),
    email: z.string().nullable(),
    nombre: z.string().nullable(),
  }),
  plazoEn: z.string().nullable(),
  recibidaEn: z.string(),
  responsableId: z.string().nullable(),
  resultado: z.string().nullable(),
  documentoEvidenciaId: z.string().nullable(),
});

/** Cambia el estado de una solicitud con un UPDATE condicional (sin TOCTOU) y emite el evento. */
export async function transicionarSolicitud(
  ctx: Contexto,
  id: string,
  desde: string,
  data: Record<string, unknown>,
  evento: { tipo: string; payload: unknown },
): Promise<FilaSolicitud> {
  return ctx.transaccion(async (tx: TenantTx) => {
    const alcance = await dondeSolicitud({ ...ctx, db: tx });
    const { count } = await tx.solicitudArco.updateMany({
      where: { id, estado: desde, ...alcance },
      data,
    });
    if (count !== 1) throw conflicto("La solicitud cambió de estado; vuelve a cargarla.");
    await ctx.eventos.emitir(tx, {
      tipo: evento.tipo,
      entidadTipo: "solicitud_arco",
      entidadId: id,
      payload: evento.payload,
    });
    const fila = await tx.solicitudArco.findUnique({ where: { id } });
    if (!fila) throw noEncontrado("La solicitud");
    return fila as FilaSolicitud;
  });
}

export const vistaSolicitud = (f: FilaSolicitud) => ({
  id: f.id,
  tipo: f.tipo,
  estado: f.estado,
  titular: {
    tipo: f.titularTipo,
    id: f.titularId,
    email: f.titularEmail,
    nombre: f.titularNombre,
  },
  plazoEn: f.plazoEn ? f.plazoEn.toISOString() : null,
  recibidaEn: f.recibidaEn.toISOString(),
  responsableId: f.responsableId,
  resultado: f.resultado,
  documentoEvidenciaId: f.documentoEvidenciaId,
});
