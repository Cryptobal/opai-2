import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { ESTADOS_ACTIVOS, estadoEfectivo, pesoSeveridad, SEVERIDADES } from "../domain";
import {
  alertaSchema,
  cursorDe,
  estadoSchema,
  eventoSchema,
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
          input.estado ? { estado: input.estado } : {},
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
  output: z.object({ alerta: alertaSchema, eventos: z.array(eventoSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const a = await alertaVisible(ctx, input.id);
    const eventos = await ctx.db.centralAlertaEvento.findMany({
      where: { alertaId: a.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return {
      alerta: vistaAlerta(a, new Date()),
      eventos: eventos.map((e) => ({ ...e, actorTipo: e.actorTipo as "persona" | "agente" | "sistema" })),
    };
  },
});

const conteoSchema = z.object(Object.fromEntries(SEVERIDADES.map((s) => [s, z.number().int()])) as Record<
  (typeof SEVERIDADES)[number],
  z.ZodNumber
>);

export const centralEstado = defineCapability({
  auditarLectura: (s) => s.instalaciones.map((i) => i.instalacionId),
  id: "central.estado",
  descripcion:
    "Foto en vivo de la central: alertas activas por severidad, pospuestas y las instalaciones con más problemas, ordenadas por la alerta más grave.",
  permiso: PERMISO_VER,
  input: z.object({}),
  output: z.object({
    activas: conteoSchema,
    pospuestas: z.number().int(),
    instalaciones: z.array(
      z.object({ instalacionId: uuidSchema, activas: z.number().int(), peor: severidadSchema }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const ahora = new Date();
    const filas = await ctx.db.centralAlerta.findMany({
      where: { ...dondeAlcance(ctx), estado: { in: [...ESTADOS_ACTIVOS, "pospuesta"] } },
      select: { instalacionId: true, severidad: true, estado: true, estadoPrevio: true, pospuestaHasta: true },
    });
    const activas = Object.fromEntries(SEVERIDADES.map((s) => [s, 0])) as Record<(typeof SEVERIDADES)[number], number>;
    const porInstalacion = new Map<string, { activas: number; peor: (typeof SEVERIDADES)[number] }>();
    let pospuestas = 0;
    for (const f of filas) {
      if (estadoEfectivo(f, ahora) === "pospuesta") {
        pospuestas++;
        continue;
      }
      const sev = f.severidad as (typeof SEVERIDADES)[number];
      activas[sev]++;
      const i = porInstalacion.get(f.instalacionId) ?? { activas: 0, peor: sev };
      i.activas++;
      if (pesoSeveridad(sev) < pesoSeveridad(i.peor)) i.peor = sev;
      porInstalacion.set(f.instalacionId, i);
    }
    const instalaciones = [...porInstalacion.entries()]
      .map(([instalacionId, v]) => ({ instalacionId, ...v }))
      .sort((a, b) => pesoSeveridad(a.peor) - pesoSeveridad(b.peor) || b.activas - a.activas)
      .slice(0, 20);
    return { activas, pospuestas, instalaciones };
  },
});
