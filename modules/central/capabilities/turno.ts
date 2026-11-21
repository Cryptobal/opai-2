import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

import { PERMISO_ATENDER, uuidSchema } from "./esquemas";

const salida = z.object({ id: uuidSchema, estado: z.string() });
const persona = (ctx: { usuario: { id: string } | null }) => {
  if (!ctx.usuario) throw prohibido("El turno de central es de una persona.");
  return ctx.usuario.id;
};

type SalidaTurno = z.infer<typeof salida>;

function turnoPersona<Input extends z.ZodTypeAny>(
  id: string,
  descripcion: string,
  input: Input,
  handler: (ctx: Contexto, input: z.infer<Input>, dryRun: boolean) => Promise<SalidaTurno>,
) {
  return defineCapability({
    id,
    descripcion,
    permiso: PERMISO_ATENDER,
    soloPersonas: true,
    input,
    output: salida,
    efecto: "escritura",
    dryRun: true,
    async handler(ctx, i, { dryRun }) {
      return handler(ctx, i, dryRun);
    },
  });
}

export const turnoAbrir = turnoPersona(
  "central.turno.abrir",
  "Abre tu turno de central: desde ahora eres la persona a cargo y respondes por el agente.",
  z.object({}),
  async (ctx, _i, dryRun) => {
    const yo = persona(ctx);
    if (await ctx.db.centralTurno.findFirst({ where: { estado: { not: "cerrado" } }, select: { id: true } }))
      throw reglaDeNegocio("Ya hay un turno de central abierto: pide que te lo entreguen.");
    if (dryRun) return { id: yo, estado: "abierto" };
    const t = await ctx
      .transaccion((tx) => tx.centralTurno.create({ data: { tenantId: ctx.tenantId, operadorId: yo } }))
      .catch((e: unknown) => {
        throw (e as { code?: string }).code === "P2002" ? reglaDeNegocio("Ya hay un turno de central abierto.") : e;
      });
    return { id: t.id, estado: t.estado };
  },
);

export const turnoEntregar = turnoPersona(
  "central.turno.entregar",
  "Entrega tu turno de central a otra persona con una nota (alertas abiertas, pendientes); queda en entrega hasta que ella lo acepte.",
  z.object({ aUsuarioId: uuidSchema, nota: z.string().trim().max(2000).default("") }),
  async (ctx, i, dryRun) => {
    const yo = persona(ctx);
    const t = await ctx.db.centralTurno.findFirst({ where: { estado: "abierto", operadorId: yo } });
    if (!t) throw reglaDeNegocio("No tienes un turno de central abierto.");
    if (i.aUsuarioId === yo) throw reglaDeNegocio("Entrega el turno a otra persona.");
    if (!(await ctx.db.membership.findFirst({ where: { userId: i.aUsuarioId, estado: "activa" }, select: { id: true } })))
      throw noEncontrado("La persona");
    if (dryRun) return { id: t.id, estado: "en_entrega" };
    await ctx.transaccion(async (tx) => {
      const { count } = await tx.centralTurno.updateMany({
        where: { id: t.id, estado: "abierto", operadorId: yo },
        data: { estado: "en_entrega", entregaAId: i.aUsuarioId, notaEntrega: i.nota || null },
      });
      if (count !== 1) throw reglaDeNegocio("Tu turno cambió mientras lo entregabas.");
    });
    return { id: t.id, estado: "en_entrega" };
  },
);

export const turnoAceptar = turnoPersona(
  "central.turno.aceptar",
  "Acepta el turno de central que te entregaron: el anterior se cierra y las alertas que tenía tomadas pasan a tu nombre.",
  z.object({}),
  async (ctx, _i, dryRun) => {
    const yo = persona(ctx);
    const t = await ctx.db.centralTurno.findFirst({ where: { estado: "en_entrega", entregaAId: yo } });
    if (!t) throw reglaDeNegocio("No hay un turno de central entregado a ti.");
    if (dryRun) return { id: t.id, estado: "abierto" };
    const nuevo = await ctx.transaccion(async (tx) => {
      const { count } = await tx.centralTurno.updateMany({
        where: { id: t.id, estado: "en_entrega", entregaAId: yo },
        data: { estado: "cerrado", cerradoEn: new Date(), entregaAId: null },
      });
      if (count !== 1) throw reglaDeNegocio("El turno ya no está en entrega.");
      await tx.centralAlerta.updateMany({ where: { tomadaPorId: t.operadorId }, data: { tomadaPorId: yo, tomadaEn: new Date() } });
      return tx.centralTurno.create({ data: { tenantId: ctx.tenantId, operadorId: yo } });
    });
    return { id: nuevo.id, estado: nuevo.estado };
  },
);

export const turnoCerrar = turnoPersona(
  "central.turno.cerrar",
  "Cierra tu turno de central sin entregarlo: queda a cargo el responsable de respaldo; tus alertas tomadas siguen a tu nombre.",
  z.object({}),
  async (ctx, _i, dryRun) => {
    const yo = persona(ctx);
    const t = await ctx.db.centralTurno.findFirst({ where: { estado: { not: "cerrado" }, operadorId: yo } });
    if (!t) throw reglaDeNegocio("No tienes un turno de central abierto.");
    if (dryRun) return { id: t.id, estado: "cerrado" };
    await ctx.transaccion((tx) =>
      tx.centralTurno.updateMany({
        where: { id: t.id, operadorId: yo, estado: { not: "cerrado" } },
        data: { estado: "cerrado", cerradoEn: new Date(), entregaAId: null },
      }),
    );
    return { id: t.id, estado: "cerrado" };
  },
);