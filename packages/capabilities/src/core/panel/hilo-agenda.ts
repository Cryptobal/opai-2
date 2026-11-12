import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { PERMISO_READ as TAREAS_READ } from "../crm/actividades-comun";
import { actividadesTareas } from "../crm/actividades-lectura";
import { documentosVencimientos } from "../documentos/vencimientos";

const SIN_DRY = { dryRun: false } as const;

const itemAgendaSchema = z.object({
  id: z.string().describe("Id de la tarea o del documento."),
  origen: z.enum(["tarea", "documento"]),
  cuando: z
    .string()
    .describe("Vencimiento: fecha y hora ISO (tarea) o día aaaa-mm-dd (documento)."),
  titulo: z.string().describe("Título de la tarea o tipo de documento."),
  nota: z
    .string()
    .nullable()
    .describe("Nombre de la ficha a la que pertenece, si el actor puede verla."),
  ficha: z.object({ tipo: z.string(), id: z.string() }).nullable(),
  vencido: z.boolean(),
  href: z.string().describe("Pantalla de OPAI donde se atiende."),
});

const HREF_ENTIDAD: Record<string, string> = {
  persona: "/personas",
  instalacion: "/instalaciones",
  cuenta: "/cuentas",
};

/**
 * «Agenda» del hilo: lo que viene, en una sola lista ordenada por fecha. Cada fuente se suma solo si
 * el actor tiene su permiso, y cada una aplica su propio alcance por filas (ADR-022): tareas propias
 * con fecha y documentos vencidos o por vencer. No es un calendario ni se edita (ADR-032).
 */
export const hiloAgenda = defineCapability({
  auditarLectura: (s) => [
    // Tareas reveladas (mismo criterio que `core.actividades.tareas`).
    ...s.items.filter((i) => i.origen === "tarea").map((i) => i.id),
    ...s.items.filter((i) => i.origen === "documento").map((i) => i.id),
    // Personas cuyo nombre se reveló: mismo criterio que `core.documentos.vencimientos`.
    ...s.items.flatMap((i) =>
      i.origen === "documento" && i.ficha?.tipo === "persona" && i.nota ? [i.ficha.id] : [],
    ),
  ],
  id: "core.hilo.agenda",
  descripcion:
    "Agenda para el hilo: tareas propias con fecha y documentos vencidos o por vencer en los próximos días, en una lista ordenada por fecha, según los permisos y el alcance de quien consulta.",
  permiso: null,
  input: z.object({
    dias: z
      .number()
      .int()
      .min(1)
      .max(90)
      .default(14)
      .describe("Horizonte de documentos por vencer."),
  }),
  output: z.object({
    items: z.array(itemAgendaSchema),
    fuentes: z.array(z.enum(["tareas", "documentos"])).describe("Fuentes que el actor puede ver."),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const fuentes: ("tareas" | "documentos")[] = [];
    const items: z.infer<typeof itemAgendaSchema>[] = [];
    const ahora = Date.now();
    if (ctx.autorizar(TAREAS_READ) && ctx.usuario) {
      fuentes.push("tareas");
      const r = await actividadesTareas.handler(
        ctx,
        { equipo: false, estado: "pendiente", limite: 50 },
        SIN_DRY,
      );
      for (const t of r.items) {
        if (!t.vencimiento) continue;
        items.push({
          id: t.id,
          origen: "tarea",
          cuando: t.vencimiento,
          titulo: t.titulo,
          nota: t.vinculosDetalle[0]?.nombre || null,
          ficha: t.vinculosDetalle[0]
            ? { tipo: t.vinculosDetalle[0].tipo, id: t.vinculosDetalle[0].id }
            : null,
          vencido: Date.parse(t.vencimiento) < ahora,
          href: "/tareas",
        });
      }
    }
    if (ctx.autorizar(PERMISOS_CORE.documentosRead)) {
      fuentes.push("documentos");
      const docs = await documentosVencimientos.handler(ctx, { dias: input.dias }, SIN_DRY);
      for (const d of docs) {
        if (!d.venceEn) continue;
        const e = d.entidad;
        items.push({
          id: d.id,
          origen: "documento",
          cuando: d.venceEn,
          titulo: d.tipo ?? "Documento",
          nota: e?.nombre ?? null,
          ficha: e ? { tipo: e.tipo, id: e.id } : null,
          vencido: d.vigencia === "vencido",
          href: e && HREF_ENTIDAD[e.tipo] ? `${HREF_ENTIDAD[e.tipo]}/${e.id}` : "/documentos",
        });
      }
    }
    items.sort((a, b) => a.cuando.localeCompare(b.cuando));
    return { items: items.slice(0, 100), fuentes };
  },
});
