import { z } from "zod";

import { microAUsd, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { iso, requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";

export const platformEventosList = defineCapability({
  id: "platform.eventos.list",
  descripcion:
    "Plataforma: outbox de eventos de una empresa (pendientes, publicados, con error) con intentos y último error.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    estado: z.enum(["pendiente", "procesando", "publicado", "error"]).optional(),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      tipo: z.string(),
      estado: z.string(),
      intentos: z.number(),
      error: z.string().nullable(),
      createdAt: z.string().nullable(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input) {
    const filas = await requierePlataforma(ctx)
      .paraTenant(input.tenantId)
      .evento.findMany({
        where: input.estado ? { estado: input.estado } : {},
        orderBy: { createdAt: "desc" },
        take: input.limite,
      });
    return filas.map((e) => ({ ...e, createdAt: iso(e.createdAt) }));
  },
});

export const platformConsumosSummary = defineCapability({
  id: "platform.consumos.summary",
  descripcion:
    "Plataforma: consumo de cada empresa en los últimos días (costo total en USD y ejecuciones), para ver margen por tenant.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({ dias: z.number().int().min(1).max(90).default(30) }),
  output: z.array(
    z.object({
      tenantId: z.string(),
      nombre: z.string(),
      costoUsd: z.number(),
      ejecuciones: z.number(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const p = requierePlataforma(ctx);
    const desde = new Date(Date.now() - input.dias * 86_400_000);
    const tenants = await p.globales.listarTenants();
    return Promise.all(
      tenants.map(async (t) => {
        const g = await p.paraTenant(t.id).consumo.groupBy({
          by: ["recurso"],
          where: { createdAt: { gte: desde } },
          _sum: { cantidad: true, costoTotalMicro: true },
        });
        const costo = g.reduce((s, x) => s + (x._sum.costoTotalMicro ?? 0), 0);
        const ejec = g.find((x) => x.recurso === "capacidad.ejecucion")?._sum.cantidad ?? 0;
        return { tenantId: t.id, nombre: t.nombre, costoUsd: microAUsd(costo), ejecuciones: ejec };
      }),
    );
  },
});
