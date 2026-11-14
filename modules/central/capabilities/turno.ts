import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { PERMISO_ATENDER, PERMISO_VER, uuidSchema } from "./esquemas";
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

const salida = z.object({ id: uuidSchema, estado: z.string() });
const persona = (ctx: { usuario: { id: string } | null }) => {
  if (!ctx.usuario) throw prohibido("El turno de central es de una persona.");
  return ctx.usuario.id;
};

export const turnoAbrir = defineCapability({
  id: "central.turno.abrir",
  descripcion: "Abre tu turno de central: desde ahora eres la persona a cargo y respondes por el agente.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R12: quien está a cargo es siempre una persona.
  input: z.object({}),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _i, { dryRun }) {
    const yo = persona(ctx);
    if (await ctx.db.centralTurno.findFirst({ where: { estado: { not: "cerrado" } }, select: { id: true } }))
      throw reglaDeNegocio("Ya hay un turno de central abierto: pide que te lo entreguen.");
    if (dryRun) return { id: yo, estado: "abierto" };
    const t = await ctx.transaccion((tx) => tx.centralTurno.create({ data: { tenantId: ctx.tenantId, operadorId: yo } }));
    return { id: t.id, estado: t.estado };
  },
});

export const turnoEntregar = defineCapability({
  id: "central.turno.entregar",
  descripcion:
    "Entrega tu turno de central a otra persona con una nota (alertas abiertas, pendientes); queda en entrega hasta que ella lo acepte.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R15: la entrega es entre personas.
  input: z.object({ aUsuarioId: uuidSchema, nota: z.string().trim().max(2000).default("") }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const yo = persona(ctx);
    const t = await ctx.db.centralTurno.findFirst({ where: { estado: "abierto", operadorId: yo } });
    if (!t) throw reglaDeNegocio("No tienes un turno de central abierto.");
    if (i.aUsuarioId === yo) throw reglaDeNegocio("Entrega el turno a otra persona.");
    if (!(await ctx.db.membership.findFirst({ where: { userId: i.aUsuarioId, estado: "activa" }, select: { id: true } })))
      throw noEncontrado("La persona");
    if (dryRun) return { id: t.id, estado: "en_entrega" };
    await ctx.transaccion((tx) =>
      tx.centralTurno.update({ where: { id: t.id }, data: { estado: "en_entrega", entregaAId: i.aUsuarioId, notaEntrega: i.nota || null } }),
    );
    return { id: t.id, estado: "en_entrega" };
  },
});

export const turnoAceptar = defineCapability({
  id: "central.turno.aceptar",
  descripcion:
    "Acepta el turno de central que te entregaron: el anterior se cierra y las alertas que tenía tomadas pasan a tu nombre.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R15.
  input: z.object({}),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _i, { dryRun }) {
    const yo = persona(ctx);
    const t = await ctx.db.centralTurno.findFirst({ where: { estado: "en_entrega", entregaAId: yo } });
    if (!t) throw reglaDeNegocio("No hay un turno de central entregado a ti.");
    if (dryRun) return { id: t.id, estado: "abierto" };
    const nuevo = await ctx.transaccion(async (tx) => {
      await tx.centralTurno.update({ where: { id: t.id }, data: { estado: "cerrado", cerradoEn: new Date(), entregaAId: null } });
      await tx.centralAlerta.updateMany({ where: { tomadaPorId: t.operadorId }, data: { tomadaPorId: yo, tomadaEn: new Date() } });
      return tx.centralTurno.create({ data: { tenantId: ctx.tenantId, operadorId: yo } });
    });
    return { id: nuevo.id, estado: nuevo.estado };
  },
});

export const turnoCerrar = defineCapability({
  id: "central.turno.cerrar",
  descripcion:
    "Cierra tu turno de central sin entregarlo: queda a cargo el responsable de respaldo; tus alertas tomadas siguen a tu nombre.",
  permiso: PERMISO_ATENDER,
  soloPersonas: true, // R12.
  input: z.object({}),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _i, { dryRun }) {
    const yo = persona(ctx);
    const t = await ctx.db.centralTurno.findFirst({ where: { estado: { not: "cerrado" }, operadorId: yo } });
    if (!t) throw reglaDeNegocio("No tienes un turno de central abierto.");
    if (dryRun) return { id: t.id, estado: "cerrado" };
    await ctx.transaccion((tx) =>
      tx.centralTurno.update({ where: { id: t.id }, data: { estado: "cerrado", cerradoEn: new Date(), entregaAId: null } }),
    );
    return { id: t.id, estado: "cerrado" };
  },
});
