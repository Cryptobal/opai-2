import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { esCorreoDt, generarClaveFiscalizacionPlana, hashClaveFiscalizacion } from "../../domain/fiscalizacion";

const VIGENCIA_MS = 5 * 24 * 60 * 60_000;

export const fiscalizacionClavesListar = defineCapability({
  id: "asistencia.fiscalizacion_claves.listar",
  descripcion: "Lista las claves temporales otorgadas a fiscalizadores de la DT.",
  permiso: "asistencia:reportes",
  input: z.object({}),
  output: z.object({
    items: z.array(z.object({
      id: z.string(), correo: z.string(), venceEn: z.string(), revocadoEn: z.string().nullable(),
      usos: z.number(), creadoEn: z.string(),
    })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await ctx.db.fiscalizacionClave.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return {
      items: filas.map((f) => ({
        id: f.id, correo: f.correo, venceEn: f.venceEn.toISOString(), revocadoEn: f.revocadoEn?.toISOString() ?? null,
        usos: f.usos, creadoEn: f.createdAt.toISOString(),
      })),
    };
  },
});

export const fiscalizacionClavesGenerar = defineCapability({
  id: "asistencia.fiscalizacion_claves.generar",
  descripcion: "Genera una clave temporal de un solo uso para que un fiscalizador ingrese al portal.",
  permiso: "asistencia:reportes",
  input: z.object({ correo: z.string().email(), dryRun: z.boolean().optional() }),
  output: z.object({ clave: z.string().nullable(), venceEn: z.string(), correo: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i) {
    if (!esCorreoDt(i.correo)) throw reglaDeNegocio("El correo del fiscalizador debe ser @dt.gob.cl.");
    const venceEn = new Date(Date.now() + VIGENCIA_MS);
    const plana = generarClaveFiscalizacionPlana();
    if (i.dryRun) return { clave: null, venceEn: venceEn.toISOString(), correo: i.correo.trim().toLowerCase() };
    const quien = ctx.usuario?.id;
    if (!quien) throw reglaDeNegocio("Falta identificar quién genera la clave.");
    const hash = hashClaveFiscalizacion(plana);
    await ctx.db.fiscalizacionClave.create({
      data: {
        tenantId: ctx.tenantId, correo: i.correo.trim().toLowerCase(), claveHash: hash, venceEn,
        creadoPorId: quien,
      },
    });
    return { clave: plana, venceEn: venceEn.toISOString(), correo: i.correo.trim().toLowerCase() };
  },
});

export const fiscalizacionClavesRevocar = defineCapability({
  id: "asistencia.fiscalizacion_claves.revocar",
  descripcion: "Revoca una clave temporal de fiscalización antes de su vencimiento.",
  permiso: "asistencia:reportes",
  input: z.object({ claveId: z.string().uuid(), dryRun: z.boolean().optional() }),
  output: z.object({ ok: z.literal(true) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i) {
    const fila = await ctx.db.fiscalizacionClave.findUnique({ where: { id: i.claveId } });
    if (!fila) throw reglaDeNegocio("No encontramos esa clave.");
    if (fila.revocadoEn) return { ok: true as const };
    if (i.dryRun) return { ok: true as const };
    const quien = ctx.usuario?.id ?? ctx.actor.id;
    await ctx.db.fiscalizacionClave.update({
      where: { id: i.claveId },
      data: { revocadoEn: new Date(), ...(quien ? { revocadoPorId: quien } : {}) },
    });
    return { ok: true as const };
  },
});