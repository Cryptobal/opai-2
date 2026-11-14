import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { ESTADOS_ACTIVOS } from "../domain";
import {
  alertaSchema,
  cursorDe,
  estadoSchema,
  eventoSchema,
  intentoSchema,
  listaSchema,
  pagina,
  PERMISO_VER,
  severidadSchema,
  uuidSchema,
} from "./esquemas";
import { alertaVisible, dondeAlcance, vistaAlerta } from "./util";

/** Activas = en la cola (incluye las pospuestas cuyo plazo ya venció, R4a). */
function dondeVista(vista: "activas" | "pospuestas" | "cerradas" | "todas", ahora: Date) {
  const pospuestaVencida = { estado: "pospuesta", pospuestaHasta: { lte: ahora } };
  if (vista === "activas") return { OR: [{ estado: { in: [...ESTADOS_ACTIVOS] } }, pospuestaVencida] };
  if (vista === "pospuestas") return { estado: "pospuesta", pospuestaHasta: { gt: ahora } };
  if (vista === "cerradas") return { estado: { in: ["resuelta", "falsa_alarma"] } };
  return {};
}

/** Filtro por estado efectivo: una pospuesta vencida cuenta en el estado al que volvió. */
function dondeEstado(estado: string, ahora: Date) {
  if (estado === "pospuesta") return { estado, pospuestaHasta: { gt: ahora } };
  if (!ESTADOS_ACTIVOS.includes(estado as (typeof ESTADOS_ACTIVOS)[number])) return { estado };
  return { OR: [{ estado }, { estado: "pospuesta", pospuestaHasta: { lte: ahora }, estadoPrevio: estado }] };
}

export const alertasListar = defineCapability({
  auditarLectura: (s) => s.items.flatMap((a) => [a.id, ...(a.personaId ? [a.personaId] : [])]),
  id: "central.alertas.listar",
  descripcion:
    "Lista las alertas de la central (activas, pospuestas, cerradas o todas), filtrables por severidad, estado e instalación; un supervisor solo ve las de sus instalaciones.",
  permiso: PERMISO_VER,
  input: listaSchema.extend({
    vista: z.enum(["activas", "pospuestas", "cerradas", "todas"]).default("activas"),
    severidad: severidadSchema.optional(),
    estado: estadoSchema.optional(),
    instalacionId: uuidSchema.optional(),
  }),
  output: z.object({ items: z.array(alertaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ahora = new Date();
    const filas = await ctx.db.centralAlerta.findMany({
      where: {
        AND: [
          dondeAlcance(ctx),
          dondeVista(input.vista, ahora),
          input.severidad ? { severidad: input.severidad } : {},
          input.estado ? dondeEstado(input.estado, ahora) : {},
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const p = pagina(filas, input.limite, input.cursor);
    return { items: p.items.map((a) => vistaAlerta(a, ahora)), siguiente: p.siguiente };
  },
});

export const alertasObtener = defineCapability({
  auditarLectura: (s) => [s.alerta.id, ...(s.alerta.personaId ? [s.alerta.personaId] : [])],
  id: "central.alertas.obtener",
  descripcion:
    "Obtiene una alerta de la central con su línea de tiempo completa: quién la abrió, cada cambio de estado, notas y cierre.",
  permiso: PERMISO_VER,
  input: z.object({ id: uuidSchema }),
  output: z.object({ alerta: alertaSchema, eventos: z.array(eventoSchema), intentos: z.array(intentoSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const a = await alertaVisible(ctx, input.id);
    const orden = [{ createdAt: "asc" as const }, { id: "asc" as const }];
    const [eventos, intentos] = await Promise.all([
      ctx.db.centralAlertaEvento.findMany({ where: { alertaId: a.id }, orderBy: orden }),
      ctx.db.centralIntento.findMany({ where: { alertaId: a.id }, orderBy: orden, take: 200 }),
    ]);
    return {
      alerta: vistaAlerta(a, new Date()),
      eventos: eventos.map((e) => ({ ...e, actorTipo: e.actorTipo as "persona" | "agente" | "sistema" })),
      intentos,
    };
  },
});
