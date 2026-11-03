// Inicio del seguimiento de un negocio (CAR-67): agenda los pasos del plan en días hábiles del tenant.
import { z } from "zod";

import { agendarPasos, generarTokenRespuesta } from "@opai/domain";

import { exigirResponsables } from "../core/crm/comun";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_MANAGE, negocioDe } from "./comun";
import { ambitoHabil, configDeVersion, seguimientoPorId, seguimientoVistaSchema, zonaDe } from "./seguimiento-comun";

export const seguimientosIniciar = defineCapability({
  id: "comercial.seguimientos.iniciar",
  descripcion:
    "Inicia el seguimiento de un negocio con un plan (por defecto, el plan por defecto de la empresa): agenda cada paso en días hábiles, con feriados de la empresa. Si ya hay uno vivo, exige reemplazarlo explícitamente.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    planId: uuidSchema.optional(),
    ancla: z.string().datetime().optional().describe("Instante desde el que se cuentan los plazos; por defecto, ahora."),
    cotizacionId: uuidSchema.optional(),
    cotizacionCodigo: z.string().max(40).optional(),
    contactoId: uuidSchema.optional(),
    asignadoId: uuidSchema.optional().describe("Quien hace los pasos de persona; por defecto, el responsable del negocio."),
    reemplazar: z.boolean().default(false),
  }),
  output: seguimientoVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    if (negocio.estado !== "abierto") throw reglaDeNegocio("Solo se hace seguimiento a un negocio abierto.");
    const plan = input.planId
      ? await ctx.db.planSeguimiento.findUnique({ where: { id: input.planId } })
      : await ctx.db.planSeguimiento.findFirst({ where: { porDefecto: true, activo: true } });
    if (!plan) throw noEncontrado("El plan de seguimiento");
    if (!plan.activo) throw reglaDeNegocio("Ese plan está desactivado.");
    const vivo = await ctx.db.seguimiento.findFirst({ where: { negocioId: negocio.id, estado: { in: ["activo", "pausado"] } } });
    if (vivo && !input.reemplazar) throw reglaDeNegocio("El negocio ya tiene un seguimiento en curso; indica reemplazar.");
    if (input.asignadoId) await exigirResponsables(ctx, [input.asignadoId]);
    // El destinatario de los correos es un contacto vinculado al negocio: el indicado o el principal.
    const vinculos = await ctx.db.negocioContacto.findMany({ where: { negocioId: negocio.id }, orderBy: { esPrincipal: "desc" } });
    const contactoId = input.contactoId ?? vinculos[0]?.contactoId ?? null;
    if (input.contactoId && !vinculos.some((v) => v.contactoId === input.contactoId)) throw noEncontrado("El contacto");
    const ancla = input.ancla ? new Date(input.ancla) : new Date();
    const config = await configDeVersion(ctx, plan.id, plan.versionActual);
    const agenda = agendarPasos(config, ancla, await ambitoHabil(ctx, ancla), await zonaDe(ctx));
    if (dryRun) {
      return {
        id: "", negocioId: negocio.id, planId: plan.id, planNombre: plan.nombre, planVersion: plan.versionActual,
        estado: "activo", estadoVisible: "activo", motivo: null, ancla: ancla.toISOString(),
        cotizacionCodigo: input.cotizacionCodigo ?? null, contactoId, proximoPasoId: null,
        pasos: agenda.map((a) => {
          const p = config.pasos[a.orden - 1]!;
          return { id: "", orden: a.orden, titulo: p.titulo, canal: p.canal, ejecutor: p.ejecutor, estado: "programado",
            programadoEn: a.programadoEn.toISOString(), asignadoId: null, asunto: null, cuerpo: null, resultado: null, error: null, hechoEn: null };
        }),
      };
    }
    const asignadoId = input.asignadoId ?? negocio.responsableId ?? null;
    const id = await ctx.transaccion(async (tx) => {
      if (vivo) {
        await tx.seguimiento.update({ where: { id: vivo.id }, data: { estado: "cancelado", motivo: "reemplazado" } });
        await tx.seguimientoPaso.updateMany({ where: { seguimientoId: vivo.id, estado: { in: ["programado", "por_hacer", "por_preparar"] } }, data: { estado: "cancelado" } });
      }
      const s = await tx.seguimiento.create({
        data: {
          tenantId: ctx.tenantId, negocioId: negocio.id, planId: plan.id, planVersion: plan.versionActual, ancla,
          cotizacionId: input.cotizacionId ?? null, cotizacionCodigo: input.cotizacionCodigo ?? null,
          contactoId, token: generarTokenRespuesta(), creadoPorId: ctx.actor.id ?? null,
        },
      });
      await tx.seguimientoPaso.createMany({
        data: agenda.map((a) => {
          const p = config.pasos[a.orden - 1]!;
          return { tenantId: ctx.tenantId, seguimientoId: s.id, orden: a.orden, canal: p.canal, ejecutor: p.ejecutor, programadoEn: a.programadoEn, asignadoId };
        }),
      });
      await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.iniciado", entidadTipo: "negocio", entidadId: negocio.id, payload: { seguimientoId: s.id, planId: plan.id } });
      return s.id;
    });
    return seguimientoPorId(ctx, id);
  },
});
