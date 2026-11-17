// Genera y envía a firma el mismo documento laboral a varias personas (CAR-633).
import { z } from "zod";

import {
  ambitoDeClase,
  enviarRequiereAprobacion,
  PERMISOS_CORE,
  type ClasePlantilla,
  type ClaseFirma,
  type NivelFirma,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy } from "../maestros/comun";
import { claseFirmaDePlantilla } from "./firmantes-laborales";
import { filaEnvioMasivo } from "./enviar-masivo-fila";
import { plantillaVigente } from "./plantilla-vigente";

const MAX = 100;

const fila = z.object({
  personaId: z.string(),
  estado: z.enum(["ok", "error", "omitido"]),
  nombre: z.string(),
  documentoId: z.string().nullable(),
  solicitudFirmaId: z.string().nullable(),
  mensaje: z.string().nullable(),
});

export const documentoPlantillasEnviarMasivo = defineCapability({
  id: "core.documento_plantillas.enviar_masivo",
  descripcion:
    "Genera el PDF de una plantilla laboral para cada persona indicada y lo envía a firma en una sola operación, con vista previa (dryRun) e idempotencia. Un fallo en una persona no detiene las demás y devuelve un resumen por fila.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    plantillaId: uuidSchema,
    personaIds: z.array(uuidSchema).min(1).max(MAX),
    fecha: diaSchema.optional(),
    mensaje: z.string().trim().max(500).optional(),
  }),
  output: z.object({
    procesadas: z.number().int(),
    exitosas: z.number().int(),
    fallidas: z.number().int(),
    filas: z.array(fila),
  }),
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: (_input) => false,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.autorizar(PERMISOS_CORE.firmasEnviar)) throw prohibido("Sin permiso para enviar documentos a firma.");
    const { plantilla, version } = await plantillaVigente(ctx, input.plantillaId);
    if (ambitoDeClase(plantilla.clase as ClasePlantilla) !== "persona")
      throw reglaDeNegocio("Solo las plantillas laborales admiten envío masivo.");
    const clase = claseFirmaDePlantilla(plantilla.clase as ClasePlantilla);
    const nivel = plantilla.nivelFirma as NivelFirma;
    if (ctx.actor.tipo === "agent" && enviarRequiereAprobacion(clase, nivel))
      throw reglaDeNegocio("Un agente necesita aprobación para enviar este documento a firma.");
    if (!dryRun && !ctx.servicios.almacenamiento.disponible)
      throw reglaDeNegocio("El almacenamiento no está configurado en este entorno.");
    const ids = [...new Set(input.personaIds)];
    if (ids.length !== input.personaIds.length) throw reglaDeNegocio("Hay personas repetidas en la lista.");
    const fecha = input.fecha ?? hoy();
    const filas: z.infer<typeof fila>[] = [];
    let exitosas = 0;
    let fallidas = 0;
    for (const personaId of ids) {
      const r = await filaEnvioMasivo(ctx, {
        plantilla,
        version,
        personaId,
        fecha,
        clase: clase as ClaseFirma,
        nivel,
        ...(input.mensaje ? { mensaje: input.mensaje } : {}),
        dryRun,
      });
      filas.push(r);
      if (r.estado === "ok") exitosas += 1;
      else fallidas += 1;
    }
    return { procesadas: filas.length, exitosas, fallidas, filas };
  },
});