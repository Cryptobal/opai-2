// Genera el documento sobre una cuenta o una instalación en PDF (CAR-315 parte 2): contrato de servicio,
// acta… Rellena la plantilla vigente, arma el PDF con la marca de la empresa y lo deja en los documentos
// de la entidad.
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
import { calcularRellenoEntidad } from "./rellenar-entidad-calculo";

export const documentoPlantillasGenerarEntidad = defineCapability({
  id: "core.documento_plantillas.generar_entidad",
  descripcion:
    "Genera en PDF un documento sobre una cuenta o una instalación (contrato de servicio, acta): rellena la plantilla vigente con los datos de la entidad, lo arma con el nombre y los datos legales de la empresa y lo guarda en los documentos de esa cuenta o instalación con su huella SHA-256. Falla si falta algún dato (usa rellenar_entidad para ver cuáles). Solo owner y admin. Con vista previa no guarda nada.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    plantillaId: uuidSchema,
    entidadId: uuidSchema.describe("ID de la cuenta o de la instalación, según el tipo de la plantilla."),
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
    const { entidad, plantilla, version, relleno, faltantes } = await calcularRellenoEntidad(ctx, input);
    if (faltantes.length)
      throw reglaDeNegocio(`Faltan datos para generar el documento: ${faltantes.map((f) => f.etiqueta).join(", ")}.`);
    if (!dryRun && !ctx.servicios.almacenamiento.disponible)
      throw reglaDeNegocio("El almacenamiento no está configurado en este entorno.");
    const marca = await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase);
    const { bytes, paginas } = await generarPdfLaboral({ titulo: plantilla.nombre, marca, parrafos: relleno.parrafos, logo: await logoDeMarca(ctx) });
    const nombre = nombreSeguro(`${plantilla.nombre}-${entidad.nombre}.pdf`);
    if (dryRun) return { documento: null, nombre, paginas };
    const documento = await guardarPdfGenerado(ctx, {
      bytes,
      nombre,
      titulo: `${plantilla.nombre} · ${entidad.nombre}`.trim(),
      plantilla,
      version,
      propietario: { tipo: entidad.tipo, id: entidad.id },
    });
    return { documento, nombre, paginas };
  },
});
