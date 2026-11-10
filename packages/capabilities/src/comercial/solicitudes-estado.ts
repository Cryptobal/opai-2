import { z } from "zod";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import type { Contexto } from "../types";
import { responsableValido } from "./validaciones";
import {
  PERMISO_SOLICITUDES_MANAGE,
  exigirPuede,
  idSolicitud,
  solicitudDe,
  solicitudSchema,
  vistaSolicitud,
} from "./solicitudes-comun";
import { resolverAvisosSolicitud } from "./solicitudes-avisos";
import { estadoTras, type AccionSolicitud } from "./solicitudes-dominio";

/** Acciones que sacan a la solicitud de «nueva»: su aviso deja de estar pendiente. */
const AVISO_RESUELTO = new Set<AccionSolicitud>(["derivar", "descartar", "marcar_duplicada"]);

type Fila = Awaited<ReturnType<typeof solicitudDe>>;

/**
 * Cambia el estado de una solicitud con su evento en una sola transacción. Con `dryRun` devuelve la
 * vista del resultado sin escribir; una acción fuera de estado responde UNPROCESSABLE.
 */
async function transicion(
  ctx: Contexto,
  id: string,
  accion: AccionSolicitud,
  evento: string,
  cambios: (s: Fila) => Record<string, unknown>,
  dryRun: boolean,
) {
  const s = await solicitudDe(ctx, id);
  exigirPuede(s.estado, accion);
  const data = { ...cambios(s), estado: estadoTras(accion, s.estado as never) };
  if (dryRun) return vistaSolicitud({ ...s, ...data } as Fila);
  const nueva = await ctx.transaccion(async (tx) => {
    const n = await tx.solicitud.update({ where: { id }, data });
    await ctx.eventos.emitir(tx, {
      tipo: evento,
      entidadTipo: "solicitud",
      entidadId: id,
      payload: { desde: s.estado, hacia: n.estado },
    });
    if (AVISO_RESUELTO.has(accion)) await resolverAvisosSolicitud(tx, ctx.tenantId, id);
    return n;
  });
  return vistaSolicitud(nueva);
}

export const solicitudesDerivar = defineCapability({
  id: "comercial.solicitudes.derivar",
  descripcion:
    "Deriva una solicitud nueva a revisión (pasa a «en revisión») y, si se indica, le asigna responsable. No crea cuentas ni negocios.",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  input: idSolicitud.extend({
    responsableId: uuidSchema.nullable().optional().describe("Responsable de revisarla."),
  }),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await responsableValido(ctx, input.responsableId);
    return transicion(
      ctx,
      input.id,
      "derivar",
      "comercial.solicitud.derivada",
      () => (input.responsableId ? { responsableId: input.responsableId } : {}),
      dryRun,
    );
  },
});

export const solicitudesDescartar = defineCapability({
  id: "comercial.solicitudes.descartar",
  descripcion:
    "Descarta una solicitud nueva o en revisión con un motivo obligatorio. Es reversible: se puede reabrir mientras no se haya convertido.",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  input: idSolicitud.extend({
    motivo: z.string().trim().min(3).max(500).describe("Por qué se descarta (queda registrado)."),
  }),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    transicion(
      ctx,
      input.id,
      "descartar",
      "comercial.solicitud.descartada",
      () => ({ motivoDescarte: input.motivo, descartadaEn: new Date() }),
      dryRun,
    ),
});

export const solicitudesReabrir = defineCapability({
  id: "comercial.solicitudes.reabrir",
  descripcion:
    "Reabre una solicitud descartada o marcada como duplicada: vuelve a «en revisión», sin motivo de descarte ni enlace a la original.",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  input: idSolicitud,
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    transicion(
      ctx,
      input.id,
      "reabrir",
      "comercial.solicitud.reabierta",
      () => ({ motivoDescarte: null, descartadaEn: null, duplicadaDeId: null }),
      dryRun,
    ),
});

export const solicitudesMarcarDuplicada = defineCapability({
  id: "comercial.solicitudes.marcar_duplicada",
  descripcion:
    "Marca una solicitud como duplicada de otra (la original): queda descartada con el enlace a la original. Se puede reabrir.",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  input: idSolicitud.extend({
    originalId: uuidSchema.describe("Solicitud original a la que se enlaza."),
  }),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.originalId === input.id)
      throw reglaDeNegocio("Una solicitud no puede ser duplicada de sí misma.");
    const original = await solicitudDe(ctx, input.originalId);
    if (original.duplicadaDeId)
      throw reglaDeNegocio("Enlaza la solicitud original, no otra duplicada.");
    return transicion(
      ctx,
      input.id,
      "marcar_duplicada",
      "comercial.solicitud.duplicada",
      () => ({
        duplicadaDeId: original.id,
        motivoDescarte: "Duplicada de otra solicitud.",
        descartadaEn: new Date(),
      }),
      dryRun,
    );
  },
});
