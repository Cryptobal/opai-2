import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { defineCapability, prohibido } from "@opai/capabilities";

import {
  cursorDe,
  estadoSchema,
  eventoSchema,
  listaSchema,
  pagina,
  ticketSchema,
  uuidSchema,
} from "./esquemas";
import { PERMISO_VER, PERMISO_VER_TODOS } from "./permisos";

type FilaTicket = {
  id: string;
  tipoId: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  solicitanteId: string;
  responsableId: string;
  motivoRechazo: string | null;
  slaVenceEn: Date | null;
  resueltoEn: Date | null;
  cerradoEn: Date | null;
  createdAt: Date;
};

function vistaTicket(
  t: FilaTicket,
  tipo: { nombre: string; requiereAprobacion: boolean },
): z.infer<typeof ticketSchema> {
  return {
    id: t.id,
    tipoId: t.tipoId,
    tipoNombre: tipo.nombre,
    tipoRequiereAprobacion: tipo.requiereAprobacion,
    titulo: t.titulo,
    descripcion: t.descripcion,
    prioridad: t.prioridad as z.infer<typeof ticketSchema>["prioridad"],
    estado: t.estado as z.infer<typeof ticketSchema>["estado"],
    solicitanteId: t.solicitanteId,
    responsableId: t.responsableId,
    motivoRechazo: t.motivoRechazo,
    slaVenceEn: t.slaVenceEn,
    resueltoEn: t.resueltoEn,
    cerradoEn: t.cerradoEn,
    createdAt: t.createdAt,
  };
}

/** Tipos por id, para no depender de `include` entre schemas distintos. */
async function tiposDe(ctx: Contexto, tipoIds: string[]) {
  const tipos = await ctx.db.tipoTicket.findMany({ where: { id: { in: [...new Set(tipoIds)] } } });
  return new Map(tipos.map((t) => [t.id, t]));
}

const TIPO_VACIO = { nombre: "", requiereAprobacion: false };

/** Alcance de la bandeja (modulos/tickets.md §2): propios, asignados o todos según permiso. */
function dondeVista(ctx: Contexto, vista: string) {
  if (vista === "mios") return { solicitanteId: ctx.usuario?.id ?? "" };
  if (vista === "asignados") return { responsableId: ctx.usuario?.id ?? "" };
  if (!ctx.autorizar(PERMISO_VER_TODOS))
    throw prohibido('Sin permiso para ver "Todos" los tickets del tenant.');
  return {};
}

export const ticketsListar = defineCapability({
  auditarLectura: (s) => s.items.flatMap((t) => [t.id, t.solicitanteId, t.responsableId]),
  id: "tickets.tickets.listar",
  descripcion:
    "Lista los tickets del tenant según la vista pedida (propios, asignados a mí o todos según permiso), con su tipo, prioridad y estado, paginados por cursor.",
  permiso: PERMISO_VER,
  input: listaSchema.extend({
    vista: z.enum(["mios", "asignados", "todos"]).default("mios"),
    estado: estadoSchema.optional(),
    tipoId: uuidSchema.optional(),
  }),
  output: z.object({ items: z.array(ticketSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.ticket.findMany({
      where: {
        ...dondeVista(ctx, input.vista),
        ...(input.estado ? { estado: input.estado } : {}),
        ...(input.tipoId ? { tipoId: input.tipoId } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    const tipos = await tiposDe(ctx, p.items.map((t) => t.tipoId));
    return {
      items: p.items.map((t) => vistaTicket(t, tipos.get(t.tipoId) ?? TIPO_VACIO)),
      siguiente: p.siguiente,
    };
  },
});

export const ticketsObtener = defineCapability({
  auditarLectura: (s) => [s.ticket.id, s.ticket.solicitanteId, s.ticket.responsableId],
  id: "tickets.tickets.obtener",
  descripcion:
    "Obtiene la ficha completa de un ticket (tipo, prioridad, estado, solicitante, responsable) con su línea de tiempo de comentarios y cambios.",
  permiso: PERMISO_VER,
  input: z.object({ id: uuidSchema }),
  output: z.object({ ticket: ticketSchema, eventos: z.array(eventoSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const t = await ctx.db.ticket.findFirst({ where: { id: input.id } });
    const veTodos = ctx.autorizar(PERMISO_VER_TODOS);
    const esPropio = t && ctx.usuario && (t.solicitanteId === ctx.usuario.id || t.responsableId === ctx.usuario.id);
    if (!t || !(veTodos || esPropio)) throw prohibido("El ticket no existe o no es visible.");
    const [tipo, eventos] = await Promise.all([
      ctx.db.tipoTicket.findFirst({ where: { id: t.tipoId } }),
      ctx.db.ticketEvento.findMany({
        where: { ticketId: t.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);
    return { ticket: vistaTicket(t, tipo ?? TIPO_VACIO), eventos };
  },
});
