import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { PERMISO_VER, uuidSchema } from "./esquemas";
import { responsableActual } from "./humano";

const turnoSchema = z.object({
  id: uuidSchema,
  operadorId: uuidSchema,
  estado: z.enum(["abierto", "en_entrega", "cerrado"]),
  entregaAId: uuidSchema.nullable(),
  notaEntrega: z.string().nullable(),
  createdAt: z.date(),
});

export const turnoEstado = defineCapability({
  auditarLectura: (s) => (s.responsable ? [s.responsable.usuarioId] : []),
  id: "central.turno.estado",
  descripcion:
    "Quién está a cargo de la central ahora (operador de turno o responsable de respaldo), el turno vivo y si el agente está en pausa en la empresa o en alguna instalación.",
  permiso: PERMISO_VER,
  input: z.object({}),
  output: z.object({
    responsable: z.object({ tipo: z.enum(["turno", "respaldo"]), usuarioId: uuidSchema }).nullable(),
    turno: turnoSchema.nullable(),
    pausadaEmpresa: z.boolean(),
    instalacionesPausadas: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [responsable, turno, pausas] = await Promise.all([
      responsableActual(ctx),
      ctx.db.centralTurno.findFirst({ where: { estado: { not: "cerrado" } } }),
      ctx.db.centralPausa.findMany({ where: { reanudadaEn: null }, select: { instalacionId: true } }),
    ]);
    return {
      responsable,
      turno: turno ? { ...turno, estado: turno.estado as "abierto" | "en_entrega" } : null,
      pausadaEmpresa: pausas.some((p) => p.instalacionId === null),
      instalacionesPausadas: pausas.filter((p) => p.instalacionId !== null).length,
    };
  },
});
