import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

async function historial(ctx: { db: { mandanteAccesoEvento: { findMany: Function } } }, accesoId: string) {
  const ev = await ctx.db.mandanteAccesoEvento.findMany({
    where: { accesoId }, orderBy: { createdAt: "desc" }, take: 30,
  });
  return ev.map((e: { id: string; tipo: string; detalle: string; createdAt: Date }) => ({
    id: e.id, tipo: e.tipo, detalle: e.detalle, cuando: e.createdAt.toISOString(),
  }));
}

export const mandanteAccesosListar = defineCapability({
  id: "asistencia.mandante_accesos.listar",
  descripcion: "Lista los accesos de mandante y EST a los registros de asistencia.",
  permiso: "asistencia:reportes",
  input: z.object({ tipo: z.enum(["mandante", "est", "todos"]).default("todos") }),
  output: z.object({
    items: z.array(z.object({
      id: z.string(), cuentaId: z.string(), tipo: z.enum(["mandante", "est"]), correo: z.string(),
      estado: z.enum(["activo", "revocado"]), instalaciones: z.array(z.string()),
    })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const filas = await ctx.db.mandanteAcceso.findMany({
      where: i.tipo === "todos" ? {} : { tipo: i.tipo },
      include: { instalaciones: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return {
      items: filas.map((f) => ({
        id: f.id, cuentaId: f.cuentaId, tipo: f.tipo as "mandante" | "est", correo: f.correo,
        estado: f.estado as "activo" | "revocado",
        instalaciones: f.todasInstalaciones ? [] : f.instalaciones.map((x) => x.instalacionId),
      })),
    };
  },
});

export const mandanteAccesosDar = defineCapability({
  id: "asistencia.mandante_accesos.dar",
  descripcion: "Otorga a un mandante o EST acceso de solo lectura a marcas de instalaciones elegidas.",
  permiso: "asistencia:reportes",
  input: z.object({
    cuentaId: z.string().uuid(),
    tipo: z.enum(["mandante", "est"]),
    correo: z.string().email(),
    todasInstalaciones: z.boolean().default(false),
    instalacionIds: z.array(z.string().uuid()).default([]),
    dryRun: z.boolean().optional(),
  }),
  output: z.object({ id: z.string().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i) {
    if (!i.todasInstalaciones && i.instalacionIds.length === 0) {
      throw reglaDeNegocio("Elige al menos una instalación.");
    }
    if (i.dryRun) return { id: null };
    const quien = ctx.usuario?.id;
    if (!quien) throw reglaDeNegocio("Falta identificar quién otorga el acceso.");
    const acc = await ctx.transaccion(async (tx) => {
      const a = await tx.mandanteAcceso.create({
        data: {
          tenantId: ctx.tenantId, cuentaId: i.cuentaId, tipo: i.tipo, correo: i.correo.trim().toLowerCase(),
          todasInstalaciones: i.todasInstalaciones, creadoPorId: quien,
        },
      });
      if (!i.todasInstalaciones) {
        await tx.mandanteAccesoInstalacion.createMany({
          data: i.instalacionIds.map((instalacionId) => ({ tenantId: ctx.tenantId, accesoId: a.id, instalacionId })),
        });
      }
      await tx.mandanteAccesoEvento.create({
        data: {
          tenantId: ctx.tenantId, accesoId: a.id, actorId: quien, tipo: "otorgado",
          detalle: `Acceso ${i.tipo} para ${i.correo}`,
        },
      });
      return a;
    });
    return { id: acc.id };
  },
});

export const mandanteAccesosRevocar = defineCapability({
  id: "asistencia.mandante_accesos.revocar",
  descripcion: "Revoca el acceso de solo lectura de un mandante o EST a los registros de asistencia.",
  permiso: "asistencia:reportes",
  input: z.object({ accesoId: z.string().uuid(), dryRun: z.boolean().optional() }),
  output: z.object({ ok: z.literal(true) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i) {
    const acc = await ctx.db.mandanteAcceso.findUnique({ where: { id: i.accesoId } });
    if (!acc) throw noEncontrado("El acceso");
    if (acc.estado === "revocado") return { ok: true as const };
    if (i.dryRun) return { ok: true as const };
    const quien = ctx.usuario?.id ?? ctx.actor.id;
    await ctx.transaccion(async (tx) => {
      await tx.mandanteAcceso.update({
        where: { id: i.accesoId },
        data: {
          estado: "revocado", revocadoEn: new Date(),
          ...(quien ? { revocadoPorId: quien } : {}),
        },
      });
      await tx.mandanteAccesoEvento.create({
        data: {
          tenantId: ctx.tenantId, accesoId: i.accesoId, tipo: "revocado", detalle: "Acceso revocado",
          ...(quien ? { actorId: quien } : {}),
        },
      });
    });
    return { ok: true as const };
  },
});

export const mandanteAccesosHistorial = defineCapability({
  id: "asistencia.mandante_accesos.historial",
  descripcion: "Lista el historial de otorgamientos, usos y revocaciones de un acceso de mandante.",
  permiso: "asistencia:reportes",
  input: z.object({ accesoId: z.string().uuid() }),
  output: z.object({ eventos: z.array(z.object({ id: z.string(), tipo: z.string(), detalle: z.string(), cuando: z.string() })) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    return { eventos: await historial(ctx, i.accesoId) };
  },
});