// Lectura del seguimiento comercial (CAR-67): uno por id y la lista con filtros.
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { PERMISO_READ } from "./comun";
import { configDeVersion, seguimientoPorId, seguimientoVistaSchema, vistaSeguimiento } from "./seguimiento-comun";

export const seguimientosGet = defineCapability({
  auditarLectura: () => [],
  id: "comercial.seguimientos.get",
  descripcion:
    "Devuelve el seguimiento de un negocio con su plan, su estado, cada paso (canal, quién lo ejecuta, fecha, resultado) y cuál es el próximo. Los textos de correos del cliente no vienen aquí.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema.optional(), negocioId: uuidSchema.optional() }).refine((v) => v.id || v.negocioId, "Indica id o negocioId."),
  output: seguimientoVistaSchema.nullable(),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (input.id) return seguimientoPorId(ctx, input.id);
    const s = await ctx.db.seguimiento.findFirst({ where: { negocioId: input.negocioId ?? "" }, orderBy: { createdAt: "desc" } });
    return s ? seguimientoPorId(ctx, s.id) : null;
  },
});

export const seguimientosList = defineCapability({
  auditarLectura: () => [],
  id: "comercial.seguimientos.list",
  descripcion:
    "Lista los seguimientos comerciales con su próximo paso, para la bandeja de pendientes: filtra por estado, por responsable del paso y por si hay pasos para hoy o atrasados.",
  permiso: PERMISO_READ,
  input: z.object({
    estado: z.enum(["activo", "pausado", "terminado", "cancelado"]).optional(),
    asignadoId: uuidSchema.optional(),
    soloPendientes: z.boolean().default(false).describe("Solo seguimientos con un paso por hacer, por preparar o fallido."),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.array(seguimientoVistaSchema.extend({ negocioTitulo: z.string() })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.seguimiento.findMany({
      where: {
        ...(input.estado ? { estado: input.estado } : {}),
        ...(input.soloPendientes || input.asignadoId
          ? {
              id: {
                in: (
                  await ctx.db.seguimientoPaso.findMany({
                    where: {
                      ...(input.soloPendientes ? { estado: { in: ["por_hacer", "por_preparar", "fallido"] } } : {}),
                      ...(input.asignadoId ? { asignadoId: input.asignadoId } : {}),
                    },
                    select: { seguimientoId: true },
                    distinct: ["seguimientoId"],
                  })
                ).map((p) => p.seguimientoId),
              },
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: input.limite,
    });
    const planes = new Map((await ctx.db.planSeguimiento.findMany()).map((p) => [p.id, p.nombre]));
    const pasos = await ctx.db.seguimientoPaso.findMany({ where: { seguimientoId: { in: filas.map((s) => s.id) } } });
    const negocios = new Map((await ctx.db.negocio.findMany({ where: { id: { in: filas.map((s) => s.negocioId) } }, select: { id: true, titulo: true } })).map((n) => [n.id, n.titulo]));
    return Promise.all(
      filas.map(async (s) => ({
        ...vistaSeguimiento(s, pasos.filter((p) => p.seguimientoId === s.id), await configDeVersion(ctx, s.planId, s.planVersion), planes.get(s.planId) ?? ""),
        negocioTitulo: negocios.get(s.negocioId) ?? "Negocio",
      })),
    );
  },
});
