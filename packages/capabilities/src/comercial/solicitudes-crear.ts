import { z } from "zod";

import { defineCapability } from "../define";
import { emailSchema, uuidSchema } from "../core/esquemas";
import { definidos, rutSchema, telefonoSchema, textoOpcional } from "../core/maestros/comun";
import {
  CAMPOS_PROPUESTOS,
  exigirTopeEscriturasAgente,
  fusionarCamposPropuestos,
  type CampoPropuesto,
} from "./solicitudes-agente-comun";
import { PERMISO_SOLICITUDES_MANAGE, solicitudSchema, vistaSolicitud } from "./solicitudes-comun";
import { responsableValido } from "./validaciones";
import type { CanalSolicitud } from "./solicitudes-dominio";

export const camposSolicitud = {
  textoOriginal: z
    .string()
    .trim()
    .min(1)
    .max(20_000)
    .describe(
      "Texto tal como lo escribió quien consulta (correo, mensaje pegado, notas). Se guarda sin tocar.",
    ),
  asunto: textoOpcional(200),
  nombre: textoOpcional(160).describe("Nombre de la persona que consulta."),
  empresa: textoOpcional(160),
  email: emailSchema.nullable().optional(),
  telefono: telefonoSchema.nullable().optional(),
  rut: rutSchema.nullable().optional().describe("RUT de la empresa o persona, si lo informó."),
  comuna: textoOpcional(80),
  servicio: textoOpcional(160).describe("Servicio que pide (por ejemplo «guardias 24/7»)."),
  fuente: textoOpcional(120).describe("Origen comercial (campaña, referido, canal de marketing)."),
};

export const solicitudesCreate = defineCapability({
  id: "comercial.solicitudes.create",
  descripcion:
    "Registra una solicitud (lead) en la bandeja, siempre en estado «nueva». Un agente la registra por el canal «agente»; una persona, por «manual». Guarda el texto original sin tocar y no crea cuentas ni negocios.",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  input: z.object({
    ...camposSolicitud,
    responsableId: uuidSchema
      .nullable()
      .optional()
      .describe("Responsable; por defecto el del canal."),
  }),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await responsableValido(ctx, input.responsableId);
    const esAgente = ctx.actor.tipo === "agent";
    const canal: CanalSolicitud = esAgente ? "agente" : "manual";
    const config = await ctx.db.canalSolicitud.findUnique({
      where: { tenantId_canal: { tenantId: ctx.tenantId, canal } },
    });
    const responsableId = input.responsableId ?? config?.responsableId ?? null;
    const parcial: Partial<Record<CampoPropuesto, unknown>> = {};
    for (const k of CAMPOS_PROPUESTOS) {
      if (input[k] !== undefined && input[k] !== null && String(input[k]).trim() !== "") {
        parcial[k] = input[k];
      }
    }
    const data = definidos({
      ...input,
      canal,
      estado: "nueva",
      responsableId,
      registradaPorTipo: esAgente ? "agente" : "usuario",
      registradaPorId: ctx.usuario?.id ?? null,
      // Solo agentes con key: el agente interno y las apps OAuth no tienen (CAR-247).
      registradaPorApiKeyId: ctx.actor.tipo === "agent" && !ctx.actor.interno ? ctx.actor.id : null,
      camposPropuestosAgente: esAgente ? fusionarCamposPropuestos([], parcial) : [],
    });
    if (dryRun) {
      return vistaSolicitud({
        id: "",
        asunto: null,
        nombre: null,
        empresa: null,
        email: null,
        telefono: null,
        rut: null,
        comuna: null,
        servicio: null,
        fuente: null,
        notasAgente: null,
        motivoDescarte: null,
        descartadaEn: null,
        convertidaEn: null,
        duplicadaDeId: null,
        negocioId: null,
        cuentaId: null,
        contactoId: null,
        createdAt: new Date(),
        ...data,
        camposPropuestosAgente: data.camposPropuestosAgente ?? [],
        responsableId,
        registradaPorId: data.registradaPorId ?? null,
      });
    }
    if (esAgente) await exigirTopeEscriturasAgente(ctx);
    const creada = await ctx.transaccion(async (tx) => {
      const s = await tx.solicitud.create({ data: { ...data, tenantId: ctx.tenantId } });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.solicitud.creada",
        entidadTipo: "solicitud",
        entidadId: s.id,
        payload: { canal: s.canal, responsableId: s.responsableId },
      });
      return s;
    });
    return vistaSolicitud(creada);
  },
});
