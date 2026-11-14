import { randomUUID } from "node:crypto";

import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { dondeInstalacionId, instalacionEnAlcance } from "../rondas/comun";
import type { Contexto } from "../types";
import { PERMISO_REGISTROS } from "./comun";

const motivo = z.string().trim().min(3).max(300);
/** Persona responsable de la corrección: el usuario o, si actúa un agente, el usuario por el que actúa. */
const quien = (ctx: Contexto) =>
  ctx.actor.tipo === "user" ? (ctx.actor.id ?? null) : (ctx.actor.viaUserId ?? null);

/** Registro del alcance del actor, con su salida y su anulación (o NOT_FOUND sin revelar que existe). */
async function registroEnAlcance(ctx: Contexto, id: string) {
  const r = await ctx.db.registroAcceso.findFirst({
    where: { AND: [{ id }, dondeInstalacionId(ctx)] },
    select: {
      id: true,
      instalacionId: true,
      salida: { select: { id: true } },
      anulacion: { select: { id: true } },
    },
  });
  if (!r) throw noEncontrado("El registro de acceso");
  if (r.anulacion) throw reglaDeNegocio("El registro ya está anulado.");
  return r;
}

/** R24: anular es un hecho nuevo con motivo; el registro original no se toca. A un agente le pide aprobación humana. */
export const registrosAnular = defineCapability({
  id: "acceso.registros.anular",
  descripcion:
    "Anula un registro de acceso con motivo, por ejemplo un ingreso registrado por error. No borra ni edita el registro: deja un hecho nuevo que lo marca anulado, con quién y por qué. Un agente necesita aprobación humana.",
  permiso: PERMISO_REGISTROS,
  input: z.object({ id: uuidSchema, motivo }),
  output: z.object({ id: uuidSchema, anuladoEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, { id, motivo: m }, { dryRun }) {
    const r = await registroEnAlcance(ctx, id);
    if (dryRun) return { id, anuladoEn: new Date().toISOString() };
    const a = await ctx.db.anulacionAcceso.create({
      data: {
        tenantId: ctx.tenantId,
        instalacionId: r.instalacionId,
        registroId: id,
        motivo: m,
        anuladaPor: quien(ctx),
      },
    });
    return { id, anuladoEn: a.createdAt.toISOString() };
  },
});

/** Salida registrada desde el ERP por una persona (sin equipo), con la hora del servidor. */
export const registrosSalida = defineCapability({
  id: "acceso.registros.salida",
  descripcion:
    "Registra la salida de quien sigue en sitio en una instalación, desde el ERP y con la hora del servidor, por ejemplo cuando la portería no la marcó. No aplica a un registro anulado ni a uno que ya salió.",
  permiso: PERMISO_REGISTROS,
  input: z.object({ id: uuidSchema, motivo: motivo.optional() }),
  output: z.object({ id: uuidSchema, salidaEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, motivo: m }, { dryRun }) {
    const r = await registroEnAlcance(ctx, id);
    if (r.salida) throw reglaDeNegocio("Este registro ya tiene salida.");
    const ahora = new Date();
    if (dryRun) return { id, salidaEn: ahora.toISOString() };
    await ctx.db.salidaAcceso.create({
      data: {
        tenantId: ctx.tenantId,
        instalacionId: r.instalacionId,
        registroId: id,
        clave: randomUUID(),
        origen: "erp",
        registradaPor: quien(ctx),
        motivo: m ?? null,
        horaCorregida: ahora,
      },
    });
    return { id, salidaEn: ahora.toISOString() };
  },
});

/** R25: cierra con motivo todos los registros abiertos de una instalación. A un agente le pide aprobación humana. */
export const registrosCerrarBloque = defineCapability({
  id: "acceso.registros.cerrar_bloque",
  descripcion:
    "Cierra en bloque, con motivo, a todos los que siguen en sitio en una instalación (por ejemplo «salida no registrada» al cierre del día). Deja una salida con la hora del servidor por cada registro abierto. Un agente necesita aprobación humana.",
  permiso: PERMISO_REGISTROS,
  input: z.object({ instalacionId: uuidSchema, motivo }),
  output: z.object({ cerrados: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, { instalacionId, motivo: m }, { dryRun }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const abiertos = await ctx.db.registroAcceso.findMany({
      where: { instalacionId, salida: null, anulacion: null },
      select: { id: true },
      take: 5_000,
    });
    if (dryRun || abiertos.length === 0) return { cerrados: abiertos.length };
    const ahora = new Date();
    const por = quien(ctx);
    // skipDuplicates: si la portería cerró uno al mismo tiempo, su salida manda y este no se duplica.
    const r = await ctx.db.salidaAcceso.createMany({
      skipDuplicates: true,
      data: abiertos.map((a) => ({
        tenantId: ctx.tenantId,
        instalacionId,
        registroId: a.id,
        clave: randomUUID(),
        origen: "cierre",
        registradaPor: por,
        motivo: m,
        horaCorregida: ahora,
      })),
    });
    return { cerrados: r.count };
  },
});
