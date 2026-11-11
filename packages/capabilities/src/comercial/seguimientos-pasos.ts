// Pasos del seguimiento (CAR-67): hacerlo, enviarlo, omitirlo o posponerlo.
import { z } from "zod";

import { esPasoPendiente, type EstadoPaso, transicionPaso } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_MANAGE } from "./comun";
import { actividadDePaso, enviarCorreoSeguimiento } from "./seguimiento-ejecucion";
import { configDeVersion, seguimientoPorId, seguimientoVistaSchema } from "./seguimiento-comun";
import { cerrarTareas, efectosPasoHecho } from "./seguimiento-tareas";
import type { Contexto } from "../types";

type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];
const etapaDestinoDe = async (ctx: Contexto, s: { planId: string; planVersion: number }, orden: number) =>
  (await configDeVersion(ctx, s.planId, s.planVersion)).pasos[orden - 1]?.etapaDestino;
async function avisoEtapa(ctx: Contexto, tx: Tx, negocioId: string, aviso: string | null) {
  if (aviso) await actividadDePaso(ctx, tx, { tipo: "nota", titulo: "Seguimiento: etapa sin cambio", detalle: aviso, negocioId });
}

async function cargar(ctx: Parameters<typeof seguimientoPorId>[0], pasoId: string) {
  const paso = await ctx.db.seguimientoPaso.findUnique({ where: { id: pasoId } });
  if (!paso) throw noEncontrado("El paso");
  const s = await ctx.db.seguimiento.findUnique({ where: { id: paso.seguimientoId } });
  if (!s) throw noEncontrado("El seguimiento");
  if (s.estado !== "activo") throw reglaDeNegocio("El seguimiento no está activo; reanúdalo primero.");
  return { paso, s };
}

export const seguimientosRegistrarPaso = defineCapability({
  id: "comercial.seguimientos.registrar_paso",
  descripcion:
    "Cierra un paso del seguimiento: lo marca hecho con su resultado (deja la actividad en el negocio), lo omite o lo pospone a otra fecha. Para enviar el correo de un paso usa enviar_paso.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    pasoId: uuidSchema,
    accion: z.enum(["hecho", "omitir", "posponer"]),
    resultado: z.string().trim().max(1000).optional(),
    nuevaFecha: z.string().datetime().optional().describe("Obligatoria al posponer."),
  }),
  output: seguimientoVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { paso, s } = await cargar(ctx, input.pasoId);
    const accion = input.accion === "hecho" ? "hacer" : input.accion;
    const destino = transicionPaso(paso.estado as EstadoPaso, accion);
    if (!destino || !esPasoPendiente(paso.estado as EstadoPaso)) throw reglaDeNegocio(`El paso está ${paso.estado}; no admite «${input.accion}».`);
    if (input.accion === "posponer" && (!input.nuevaFecha || new Date(input.nuevaFecha) <= new Date())) throw reglaDeNegocio("Indica una fecha futura para posponer.");
    if (dryRun) return seguimientoPorId(ctx, s.id);
    const etapaDestino = await etapaDestinoDe(ctx, s, paso.orden);
    await ctx.transaccion(async (tx) => {
      const base = input.accion === "posponer"
        ? { estado: destino, programadoEn: new Date(input.nuevaFecha!), actividadId: null }
        : { estado: destino, resultado: input.resultado ?? null, hechoEn: new Date(), hechoPorId: ctx.usuario?.id ?? null };
      const actividadId = input.accion === "hecho"
        ? await actividadDePaso(ctx, tx, { tipo: paso.canal === "llamada" ? "llamada" : paso.canal === "whatsapp" ? "whatsapp" : paso.canal === "correo" ? "correo" : "nota", titulo: `Seguimiento: paso ${paso.orden} hecho`, detalle: input.resultado ?? null, negocioId: s.negocioId })
        : null;
      await tx.seguimientoPaso.update({ where: { id: paso.id }, data: { ...base, ...(actividadId ? { actividadId } : {}) } });
      // CAR-160: la tarea del paso se cierra sola (hecha u omitida) y el paso hecho aplica su etapa destino.
      if (input.accion === "hecho") await avisoEtapa(ctx, tx, s.negocioId, await efectosPasoHecho(ctx, tx, { tareaId: paso.actividadId, negocioId: s.negocioId, etapaDestino }));
      // Omitido o pospuesto: la tarea de hoy se cancela; al pospuesto le llega una nueva en su fecha.
      if (input.accion !== "hecho") await cerrarTareas(ctx, tx, [paso.actividadId], "cancelada");
      await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.paso_registrado", entidadTipo: "negocio", entidadId: s.negocioId, payload: { seguimientoId: s.id, pasoId: paso.id, accion: input.accion } });
    });
    return seguimientoPorId(ctx, s.id);
  },
});

export const seguimientosEnviarPaso = defineCapability({
  id: "comercial.seguimientos.enviar_paso",
  descripcion:
    "Envía por correo el paso de seguimiento al contacto del negocio, con el asunto y el texto indicados. La respuesta del cliente llega al seguimiento y al vendedor. Un correo enviado no se retira.",
  permiso: PERMISO_MANAGE,
  input: z.object({ pasoId: uuidSchema, asunto: z.string().trim().min(3).max(200), cuerpo: z.string().trim().min(3).max(5000) }),
  output: seguimientoVistaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { paso, s } = await cargar(ctx, input.pasoId);
    if (paso.canal !== "correo") throw reglaDeNegocio("Solo los pasos por correo se envían desde aquí.");
    if (!transicionPaso(paso.estado as EstadoPaso, "hacer")) throw reglaDeNegocio(`El paso está ${paso.estado}.`);
    if (dryRun) return seguimientoPorId(ctx, s.id);
    const negocio = await ctx.db.negocio.findUnique({ where: { id: s.negocioId }, select: { responsableId: true } });
    const etapaDestino = await etapaDestinoDe(ctx, s, paso.orden);
    const para = await enviarCorreoSeguimiento(ctx, s, input.asunto, input.cuerpo, negocio?.responsableId ?? null);
    await ctx.transaccion(async (tx) => {
      const actividadId = await actividadDePaso(ctx, tx, { tipo: "correo", titulo: `Seguimiento: ${input.asunto}`, detalle: `Enviado a ${para}.`, negocioId: s.negocioId });
      await tx.seguimientoPaso.update({ where: { id: paso.id }, data: { estado: "hecho", asunto: input.asunto, cuerpo: input.cuerpo, hechoEn: new Date(), hechoPorId: ctx.usuario?.id ?? null, actividadId } });
      await avisoEtapa(ctx, tx, s.negocioId, await efectosPasoHecho(ctx, tx, { tareaId: paso.actividadId, negocioId: s.negocioId, etapaDestino }));
      await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.paso_registrado", entidadTipo: "negocio", entidadId: s.negocioId, payload: { seguimientoId: s.id, pasoId: paso.id, accion: "enviado" } });
    });
    return seguimientoPorId(ctx, s.id);
  },
});
