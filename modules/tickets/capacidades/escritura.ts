import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { ESTADOS_VIVOS } from "../domain";
import { prioridadSchema, uuidSchema } from "./esquemas";
import { PERMISO_GESTIONAR, PERMISO_VER_TODOS } from "./permisos";
import { responsablePorDefecto, ticketDe, vistaDeFila } from "./util";

export const ticketsCrear = defineCapability({
  id: "tickets.tickets.crear",
  descripcion:
    "Crea un ticket o una solicitud de un tipo configurado, con el dueño por defecto del tipo (o uno explícito si quien crea puede ver todos los tickets), prioridad y descripción.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({
    tipoId: uuidSchema,
    titulo: z.string().trim().min(3).max(140),
    descripcion: z.string().trim().min(3).max(4000),
    prioridad: prioridadSchema.default("p3"),
    responsableId: uuidSchema.optional().describe("Solo si quien crea puede ver todos los tickets."),
  }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Se necesita una sesión de usuario para crear un ticket.");
    const tipo = await ctx.db.tipoTicket.findFirst({ where: { id: input.tipoId, activo: true } });
    if (!tipo) throw noEncontrado("El tipo de ticket");
    const rol = ctx.rol;
    if (tipo.rolesPermitidos.length > 0 && !(rol && tipo.rolesPermitidos.includes(rol)))
      throw prohibido("Tu rol no puede crear este tipo de ticket.");
    const responsableId =
      input.responsableId && ctx.autorizar(PERMISO_VER_TODOS)
        ? input.responsableId
        : await responsablePorDefecto(ctx, tipo);
    if (dryRun) return { id: "" };
    const creado = await ctx.transaccion(async (tx) => {
      const t = await tx.ticket.create({
        data: {
          tenantId: ctx.tenantId,
          tipoId: tipo.id,
          titulo: input.titulo,
          descripcion: input.descripcion,
          prioridad: input.prioridad,
          estado: "abierto",
          solicitanteId: ctx.usuario!.id,
          responsableId,
        },
      });
      await tx.ticketEvento.create({
        data: { tenantId: ctx.tenantId, ticketId: t.id, tipo: "creado", actorId: ctx.usuario!.id },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.ticket.creado",
        entidadTipo: "ticket",
        entidadId: t.id,
        payload: { tipoId: tipo.id, prioridad: t.prioridad, responsableId },
      });
      return t;
    });
    return { id: creado.id };
  },
});

export const ticketsComentar = defineCapability({
  id: "tickets.tickets.comentar",
  descripcion:
    "Agrega un comentario a la línea de tiempo de un ticket vivo; lo puede hacer el solicitante, el responsable o quien ve todos los tickets.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({ id: uuidSchema, comentario: z.string().trim().min(1).max(4000) }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const t = await ticketDe(ctx, input.id);
    if (!(await vistaDeFila(ctx, t))) throw noEncontrado("El ticket");
    if (!ESTADOS_VIVOS.includes(t.estado as (typeof ESTADOS_VIVOS)[number]))
      throw reglaDeNegocio("Este ticket ya está cerrado o rechazado: no acepta comentarios.");
    if (dryRun) return { id: input.id };
    const evento = await ctx.transaccion(async (tx) => {
      const e = await tx.ticketEvento.create({
        data: {
          tenantId: ctx.tenantId,
          ticketId: t.id,
          tipo: "comentario",
          actorId: ctx.usuario!.id,
          comentario: input.comentario,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.ticket.comentado",
        entidadTipo: "ticket",
        entidadId: t.id,
      });
      return e;
    });
    return { id: evento.id };
  },
});
