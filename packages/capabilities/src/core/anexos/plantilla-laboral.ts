// Anexos sobre las plantillas de Documentos (CAR-58): si hay una plantilla de clase «Anexo» publicada
// (el texto legal que Carlos escribe en el editor), el documento final sale de ella; si no, el anexo
// sigue sin poder aprobarse (la plantilla de ejemplo no tiene validez laboral).
import { documentoUsaVariablesSensibles, etiquetaDeVariable, fechaDeDocumento, rellenarPlantilla, variablesDeDocumento } from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { generarPdfLaboral } from "../documentos/pdf-laboral";
import { valoresDePersona } from "../documentos/rellenar-valores";
import { marcaDe } from "../comunicaciones/resolver";
import type { FilaAnexoDoc } from "./plantilla";

const TITULO_MOTIVO: Record<string, string> = {
  capa: "capa de sueldo",
  monto: "monto de sueldo",
  instalacion: "instalación o puesto",
  rol: "rol de turno",
};

/** Plantilla activa de clase «Anexo» con versión publicada (la más reciente), o null. */
export async function plantillaAnexoPublicada(ctx: Contexto) {
  const p = await ctx.db.documentoPlantilla.findFirst({
    where: { clase: "anexo_contrato", activa: true, versionVigente: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
  });
  if (!p) return null;
  const version = await ctx.db.documentoPlantillaVersion.findFirst({ where: { plantillaId: p.id, numero: p.versionVigente } });
  return version ? { id: p.id, nombre: p.nombre, version: version.numero, contenido: version.contenido } : null;
}

type PersonaAnexo = { id: string; nombres: string; apellidos: string; rut: string; calle: string | null; comuna: string | null };

/** PDF del anexo: persona, contrato y sueldo de la ficha más motivo y detalle del cambio. */
export async function pdfDeAnexo(
  ctx: Contexto,
  plantilla: NonNullable<Awaited<ReturnType<typeof plantillaAnexoPublicada>>>,
  persona: PersonaAnexo,
  anexo: { motivoCambio: string },
  filas: readonly FilaAnexoDoc[],
  fecha: string,
) {
  const claves = variablesDeDocumento(plantilla.contenido);
  const { valores } = await valoresDePersona(ctx, persona, fecha, claves, documentoUsaVariablesSensibles(plantilla.contenido));
  const relleno = rellenarPlantilla(plantilla.contenido, {
    ...valores,
    "contrato.fecha": fechaDeDocumento(fecha),
    "contrato.motivo_cambio": TITULO_MOTIVO[anexo.motivoCambio] ?? anexo.motivoCambio,
    "contrato.cambios": filas.map((f) => `${f.concepto}: ${f.antes} → ${f.despues}`).join("; ") || null,
  });
  if (relleno.faltantes.length)
    throw reglaDeNegocio(`Faltan datos para generar el anexo: ${relleno.faltantes.map(etiquetaDeVariable).join(", ")}.`);
  const marca = await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase);
  return (await generarPdfLaboral({ titulo: plantilla.nombre, marca, parrafos: relleno.parrafos })).bytes;
}
