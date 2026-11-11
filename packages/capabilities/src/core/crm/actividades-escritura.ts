import { z } from "zod";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import { textoOpcional } from "../maestros/comun";
import {
  PERMISO_MANAGE,
  actividadSchema,
  vinculoActividadSchema,
  vistaActividad,
} from "./actividades-comun";
import {
  RESULTADOS_LLAMADA,
  TIPOS_ACTIVIDAD,
  exigirEntidad,
  exigirResponsables,
  refDe,
} from "./comun";

const fechaHora = z.iso.datetime({ offset: true });

export const actividadesCreate = defineCapability({
  id: "core.actividades.create",
  descripcion:
    "Registra una nota, llamada, correo, WhatsApp, reunión, visita o tarea y la liga a negocio, cuenta, contacto o instalación. Las tareas llevan vencimiento, prioridad y responsables; las reuniones, asistentes y acuerdos.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    tipo: z.enum(TIPOS_ACTIVIDAD),
    titulo: z.string().trim().min(1).max(200),
    detalle: textoOpcional(4000),
    ocurrioEn: fechaHora.optional().describe("Cuándo ocurrió; por defecto, ahora."),
    vinculos: z.array(vinculoActividadSchema).min(1).max(8),
    vencimiento: fechaHora.optional().describe("Solo tareas."),
    todoElDia: z.boolean().default(false),
    prioridad: z
      .enum(["alta", "media", "baja"])
      .optional()
      .describe("Solo tareas; por defecto media."),
    responsables: z
      .array(z.uuid())
      .max(10)
      .default([])
      .describe("Solo tareas; por defecto, quien la crea."),
    asistentes: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
    acuerdos: textoOpcional(4000),
    proximoPaso: textoOpcional(1000),
    resultado: z
      .enum(RESULTADOS_LLAMADA)
      .optional()
      .describe("Solo llamadas y correos: contestó, no contestó o pidió volver a llamar."),
    respuestaCliente: z
      .boolean()
      .default(false)
      .describe(
        "El cliente respondió (no aplica a tareas): en un negocio con seguimiento activo lo pausa o lo detiene según su plan.",
      ),
  }),
  output: actividadSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const esTarea = input.tipo === "tarea";
    if (!esTarea && (input.vencimiento || input.prioridad || input.responsables.length))
      throw reglaDeNegocio("Solo las tareas llevan vencimiento, prioridad y responsables.");
    if (
      input.tipo !== "reunion" &&
      (input.asistentes.length || input.acuerdos || input.proximoPaso)
    )
      throw reglaDeNegocio("Solo las reuniones llevan asistentes, acuerdos y próximo paso.");
    if (esTarea && input.respuestaCliente)
      throw reglaDeNegocio("Una tarea no es una respuesta del cliente.");
    // La marca pausa o detiene el seguimiento y puede mover la etapa del negocio (CAR-160): exige
    // un negocio ligado y el mismo permiso que «El cliente respondió» (comercial:negocios.manage).
    if (input.respuestaCliente && !input.vinculos.some((v) => v.tipo === "negocio"))
      throw reglaDeNegocio("La respuesta del cliente se registra en un negocio.");
    if (input.respuestaCliente && !ctx.autorizar("comercial:negocios.manage"))
      throw prohibido("Registrar una respuesta del cliente requiere gestionar negocios.");
    if (input.resultado && input.tipo !== "llamada" && input.tipo !== "correo")
      throw reglaDeNegocio("Solo las llamadas y los correos llevan resultado.");
    const claves = input.vinculos.map((v) => `${v.tipo}:${v.id}`);
    if (new Set(claves).size !== claves.length) throw reglaDeNegocio("Hay vínculos repetidos.");
    for (const v of input.vinculos) await exigirEntidad(ctx, v.tipo, v.id);
    const responsables = esTarea
      ? [
          ...new Set(
            input.responsables.length ? input.responsables : ctx.usuario ? [ctx.usuario.id] : [],
          ),
        ]
      : [];
    if (esTarea && !responsables.length)
      throw reglaDeNegocio("Una tarea necesita al menos un responsable.");
    await exigirResponsables(ctx, responsables);
    const fila = {
      tipo: input.tipo,
      titulo: input.titulo,
      detalle: input.detalle ?? null,
      ocurrioEn: new Date(input.ocurrioEn ?? Date.now()),
      vencimiento: input.vencimiento ? new Date(input.vencimiento) : null,
      todoElDia: esTarea && input.todoElDia,
      prioridad: esTarea ? (input.prioridad ?? "media") : null,
      estado: esTarea ? "pendiente" : null,
      asistentes: input.asistentes,
      acuerdos: input.acuerdos ?? null,
      proximoPaso: input.proximoPaso ?? null,
      resultado: input.resultado ?? null,
      completadaEn: null,
      creadaPorId: ctx.usuario?.id ?? null,
    };
    if (dryRun) return vistaActividad({ ...fila, id: "" }, responsables, input.vinculos);
    const creada = await ctx.transaccion(async (tx) => {
      const a = await tx.actividad.create({ data: { ...fila, tenantId: ctx.tenantId } });
      for (const v of input.vinculos)
        await tx.actividadVinculo.create({
          data: { tenantId: ctx.tenantId, actividadId: a.id, ...refDe(v.tipo, v.id) },
        });
      for (const usuarioId of responsables)
        await tx.actividadResponsable.create({
          data: { tenantId: ctx.tenantId, actividadId: a.id, usuarioId },
        });
      await ctx.eventos.emitir(tx, {
        tipo: "core.actividad.registrada",
        entidadTipo: "actividad",
        entidadId: a.id,
        // CAR-160: la marca explícita «respuesta del cliente» la consume el seguimiento comercial.
        payload: { tipo: a.tipo, ...(input.respuestaCliente ? { respuestaCliente: true } : {}) },
      });
      if (esTarea)
        await ctx.eventos.emitir(tx, {
          tipo: "core.actividad.tarea_asignada",
          entidadTipo: "actividad",
          entidadId: a.id,
          payload: { responsables },
        });
      return a;
    });
    return vistaActividad(creada, responsables, input.vinculos);
  },
});
