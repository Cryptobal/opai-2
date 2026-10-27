import { z } from "zod";

import { leerInbox } from "@opai/db";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";

const notificacionSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  cuerpo: z.string().nullable(),
  enlace: z.string().nullable(),
  leidaEn: z.string().nullable(),
  creadaEn: z.string(),
});

function usuarioDe(ctx: Contexto): string {
  if (ctx.actor.tipo !== "user") throw reglaDeNegocio("El inbox es de usuarios con sesión.");
  return ctx.actor.id;
}

export const notificacionesList = defineCapability({
  auditarLectura: false, // Inbox propio, filtrado por usuario: no es acceso a registros de terceros.
  id: "core.notificaciones.list",
  descripcion:
    "Avisos del usuario en OPAI (campana): los más recientes primero, con cantidad de no leídos.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno", "cliente"],
  input: z.object({
    soloNoLeidas: z.boolean().default(false),
    limite: z.number().int().min(1).max(100).default(30),
    antesDe: uuidSchema.optional(),
  }),
  output: z.object({ items: z.array(notificacionSchema), noLeidas: z.number() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const usuarioId = usuarioDe(ctx);
    if (input.antesDe && !await ctx.db.notificacion.findFirst({
      where: { id: input.antesDe, usuarioId }, select: { id: true },
    })) throw noEncontrado("El aviso");
    return ctx.transaccion((tx) =>
      leerInbox(tx, ctx.tenantId, usuarioId, input.soloNoLeidas, input.limite, input.antesDe),
    );
  },
});

// Escrituras de bajo valor (ADR-034 permite auditar solo el id): no emiten evento.
export const notificacionesMarcarLeida = defineCapability({
  id: "core.notificaciones.marcar_leida",
  descripcion: "Marca como leído un aviso propio del usuario en la campana de OPAI.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno", "cliente"],
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: z.string(), leidaEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const n = await ctx.db.notificacion.findFirst({ where: { id, usuarioId: usuarioDe(ctx) } });
    if (!n) throw noEncontrado("El aviso");
    const leidaEn = n.leidaEn ?? new Date();
    if (!dryRun && !n.leidaEn)
      await ctx.db.notificacion.update({ where: { id }, data: { leidaEn } });
    return { id, leidaEn: leidaEn.toISOString() };
  },
});

export const notificacionesMarcarTodas = defineCapability({
  id: "core.notificaciones.marcar_todas",
  descripcion: "Marca como leídos todos los avisos pendientes del usuario en la campana de OPAI.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno", "cliente"],
  input: z.object({}),
  output: z.object({ marcadas: z.number() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _input, { dryRun }) {
    const where = { usuarioId: usuarioDe(ctx), leidaEn: null };
    if (dryRun) return { marcadas: await ctx.db.notificacion.count({ where }) };
    const { count } = await ctx.db.notificacion.updateMany({
      where,
      data: { leidaEn: new Date() },
    });
    return { marcadas: count };
  },
});
