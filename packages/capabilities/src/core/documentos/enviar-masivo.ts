// Genera y envía a firma el mismo documento laboral a varias personas (CAR-633).
import { z } from "zod";

import {
  ambitoDeClase,
  enviarRequiereAprobacion,
  nombreSeguro,
  PERMISOS_CORE,
  type ClasePlantilla,
  type ClaseFirma,
  type NivelFirma,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy } from "../maestros/comun";
import { marcaDe } from "../comunicaciones/resolver";
import { logoDeMarca } from "../../finanzas/ventas-pdf-logo";
import { ejecutarEnvioFirma } from "../firmas/enviar-ejecutar";
import { claseFirmaDePlantilla, firmantesLaborales } from "./firmantes-laborales";
import { calcularRelleno } from "./rellenar-calculo";
import { generarPdfLaboral } from "./pdf-laboral";
import { guardarPdfGenerado } from "./guardar-generado";
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
    const fecha = input.fecha ?? hoy();
    const ids = [...new Set(input.personaIds)];
    if (ids.length !== input.personaIds.length)
      throw reglaDeNegocio("Hay personas repetidas en la lista.");
    const filas: z.infer<typeof fila>[] = [];
    let exitosas = 0;
    let fallidas = 0;
    const marca = await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase);
    const logo = await logoDeMarca(ctx);
    for (const personaId of ids) {
      let nombre = personaId;
      try {
        const { persona, relleno, faltantes } = await calcularRelleno(ctx, {
          plantillaId: plantilla.id,
          personaId,
          fecha,
        });
        nombre = `${persona.nombres} ${persona.apellidos}`.trim();
        if (faltantes.length) {
          throw reglaDeNegocio(`Faltan datos: ${faltantes.map((f) => f.etiqueta).join(", ")}.`);
        }
        const firmantes = await firmantesLaborales(ctx, { firmantes: (plantilla.firmantes ?? "ambos") as "ambos" }, persona);
        if (dryRun) {
          filas.push({
            personaId,
            estado: "ok",
            nombre,
            documentoId: null,
            solicitudFirmaId: null,
            mensaje: "Listo para generar y enviar.",
          });
          exitosas += 1;
          continue;
        }
        const { bytes } = await generarPdfLaboral({
          titulo: plantilla.nombre,
          marca,
          parrafos: relleno.parrafos,
          logo,
        });
        const pdfNombre = nombreSeguro(`${plantilla.nombre}-${persona.rut}.pdf`);
        const documento = await guardarPdfGenerado(ctx, {
          bytes,
          nombre: pdfNombre,
          titulo: `${plantilla.nombre} · ${nombre}`.trim(),
          plantilla,
          version,
          propietario: { tipo: "persona", id: persona.id },
        });
        const solicitud = await ejecutarEnvioFirma(
          ctx,
          {
            documentoId: documento.id,
            clase: clase as ClaseFirma,
            nivel,
            ...(input.mensaje ? { mensaje: input.mensaje } : {}),
            firmantes,
          },
          false,
        );
        filas.push({
          personaId,
          estado: "ok",
          nombre,
          documentoId: documento.id,
          solicitudFirmaId: solicitud.id,
          mensaje: null,
        });
        exitosas += 1;
      } catch (e) {
        const mensaje = e instanceof Error ? e.message : "No se pudo procesar.";
        filas.push({
          personaId,
          estado: "error",
          nombre,
          documentoId: null,
          solicitudFirmaId: null,
          mensaje,
        });
        fallidas += 1;
      }
    }
    return { procesadas: filas.length, exitosas, fallidas, filas };
  },
});