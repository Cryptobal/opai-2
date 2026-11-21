import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

const contratoLista = z.object({
  items: z.array(z.object({
    id: z.string(), correo: z.string(), empleadorRut: z.string(), ip: z.string().nullable(),
    via: z.enum(["correo", "clave"]), detalle: z.string(), cuando: z.string(),
  })),
  siguiente: z.string().nullable(),
});

export const fiscalizacionAccesosListar = defineCapability({
  id: "asistencia.fiscalizacion_accesos.listar",
  descripcion: "Auditoría de accesos del portal de fiscalización (solo lectura, sin borrar).",
  permiso: "asistencia:reportes",
  input: z.object({
    cursor: z.string().optional(),
    limite: z.number().int().min(1).max(100).default(50),
    desde: z.string().optional(),
    hasta: z.string().optional(),
  }),
  output: contratoLista,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const desde = i.desde ? new Date(i.desde) : undefined;
    const hasta = i.hasta ? new Date(i.hasta) : undefined;
    const filas = await ctx.db.fiscalizacionAcceso.findMany({
      where: {
        ...(desde || hasta
          ? { createdAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
          : {}),
        ...(i.cursor ? { id: { lt: i.cursor } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: i.limite + 1,
    });
    const mas = filas.length > i.limite;
    const items = (mas ? filas.slice(0, i.limite) : filas).map((f) => ({
      id: f.id, correo: f.correo, empleadorRut: f.empleadorRut, ip: f.ip,
      via: f.via as "correo" | "clave", detalle: f.detalle, cuando: f.createdAt.toISOString(),
    }));
    return { items, siguiente: mas ? items.at(-1)!.id : null };
  },
});

export const fiscalizacionRegistrarAcceso = defineCapability({
  id: "asistencia.fiscalizacion_accesos.registrar",
  descripcion: "Registra un acceso del portal de fiscalización (uso interno de la ruta pública).",
  permiso: null,
  interna: true,
  input: z.object({
    correo: z.string().email(),
    empleadorRut: z.string(),
    via: z.enum(["correo", "clave"]),
    detalle: z.string().max(500),
    ip: z.string().max(80).optional(),
    dryRun: z.boolean().optional(),
  }),
  output: z.object({ id: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i) {
    if (i.dryRun) return { id: "simulado" };
    const f = await ctx.db.fiscalizacionAcceso.create({
      data: {
        tenantId: ctx.tenantId, correo: i.correo.trim().toLowerCase(), empleadorRut: i.empleadorRut,
        via: i.via, detalle: i.detalle, ip: i.ip ?? null,
      },
    });
    return { id: f.id };
  },
});