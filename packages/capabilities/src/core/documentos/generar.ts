// Genera el documento laboral en PDF (CAR-127, PR 4b · 07 Generar documento): rellena la plantilla vigente
// con los datos de la persona, arma el PDF con la marca de la empresa y lo deja en Documentos de la ficha.
import { z } from "zod";

import { nombreSeguro, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { marcaDe } from "../comunicaciones/resolver";
import { logoDeMarca } from "../../finanzas/ventas-pdf-logo";
import { uuidSchema } from "../esquemas";
import { diaSchema } from "../maestros/comun";
import { guardarPdfGenerado } from "./guardar-generado";
import { documentoSchema } from "./vista";
import { generarPdfLaboral } from "./pdf-laboral";
import { calcularRelleno } from "./rellenar-calculo";

export const documentoPlantillasGenerar = defineCapability({
  id: "core.documento_plantillas.generar",
  descripcion:
    "Genera el documento laboral en PDF: rellena la plantilla vigente con los datos de la persona, lo arma con el nombre y los datos legales de la empresa y lo guarda en los documentos de la ficha con su huella SHA-256. Falla si falta algún dato (usa rellenar para ver cuáles). Solo owner y admin; la persona debe estar dentro del alcance. Con vista previa no guarda nada.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    plantillaId: uuidSchema,
    personaId: uuidSchema,
    fecha: diaSchema.optional().describe("Fecha del documento; por defecto, hoy."),
  }),
  output: z.object({
    documento: documentoSchema.nullable().describe("Null en la vista previa: aún no se crea."),
    nombre: z.string(),
    paginas: z.number().int(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { persona, plantilla, version, relleno, faltantes } = await calcularRelleno(ctx, input);
    if (faltantes.length)
      throw reglaDeNegocio(`Faltan datos para generar el documento: ${faltantes.map((f) => f.etiqueta).join(", ")}.`);
    if (!dryRun && !ctx.servicios.almacenamiento.disponible)
      throw reglaDeNegocio("El almacenamiento no está configurado en este entorno.");
    const marca = await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase);
    const { bytes, paginas } = await generarPdfLaboral({ titulo: plantilla.nombre, marca, parrafos: relleno.parrafos, logo: await logoDeMarca(ctx) });
    const nombre = nombreSeguro(`${plantilla.nombre}-${persona.rut}.pdf`);
    if (dryRun) return { documento: null, nombre, paginas };
    const documento = await guardarPdfGenerado(ctx, {
      bytes,
      nombre,
      titulo: `${plantilla.nombre} · ${persona.nombres} ${persona.apellidos}`.trim(),
      plantilla,
      version,
      propietario: { tipo: "persona", id: persona.id },
    });
    return { documento, nombre, paginas };
  },
});
