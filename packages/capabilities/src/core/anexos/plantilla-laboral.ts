// Anexos y plantillas de Documentos (CAR-58): prioriza la plantilla «Anexo» publicada del tenant;
// si no hay, usa el texto legal base del repositorio (mientras `esEjemplo` sea false).
import {
  documentoUsaVariablesSensibles,
  etiquetaDeVariable,
  fechaDeDocumento,
  parrafosDePlantilla,
  rellenarPlantilla,
  variablesDeDocumento,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { logoDeMarca } from "../../finanzas/ventas-pdf-logo";
import { generarPdfLaboral } from "../documentos/pdf-laboral";
import { valoresDePersona } from "../documentos/rellenar-valores";
import { marcaDe } from "../comunicaciones/resolver";
import {
  MENSAJE_PLANTILLA_EJEMPLO,
  PLANTILLA_ANEXO,
  TEXTO_LEGAL_ANEXO_APROBADO,
  rellenarTextoLegalAnexo,
  type FilaAnexoDoc,
} from "./plantilla";
import { valoresLegalesAnexo } from "./plantilla-valores";

const TITULO_MOTIVO: Record<string, string> = {
  capa: "capa de sueldo",
  monto: "monto de sueldo",
  instalacion: "instalación o puesto",
  rol: "rol de turno",
};

export type PlantillaAnexoPdf =
  | { origen: "tenant"; id: string; nombre: string; version: number; contenido: string }
  | { origen: "base"; nombre: string; contenido: string };

/** Plantilla del tenant publicada o, si la base ya no es ejemplo, el texto legal del repositorio. */
export async function plantillaAnexoParaPdf(ctx: Contexto): Promise<PlantillaAnexoPdf | null> {
  const pub = await plantillaAnexoPublicada(ctx);
  if (pub) return { origen: "tenant", ...pub };
  if (PLANTILLA_ANEXO.esEjemplo) return null;
  return { origen: "base", nombre: "Anexo de contrato de trabajo", contenido: TEXTO_LEGAL_ANEXO_APROBADO };
}

/** Sin plantilla del tenant publicada: ejemplo bloquea; con texto legal base, los faltantes se validan después. */
export async function exigirPlantillaAntesDeMaterializar(ctx: Contexto) {
  if (await plantillaAnexoPublicada(ctx)) return;
  if (PLANTILLA_ANEXO.esEjemplo) throw reglaDeNegocio(MENSAJE_PLANTILLA_EJEMPLO);
}

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

/** PDF del anexo: plantilla del tenant o texto legal base con los datos de la persona y el cambio. */
export async function pdfDeAnexo(
  ctx: Contexto,
  plantilla: PlantillaAnexoPdf,
  persona: PersonaAnexo,
  anexo: { motivoCambio: string; vinculoId: string },
  filas: readonly FilaAnexoDoc[],
  fecha: string,
) {
  const marca = await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase);
  const logo = await logoDeMarca(ctx);
  if (plantilla.origen === "base") {
    const p = await ctx.db.persona.findUniqueOrThrow({
      where: { id: persona.id },
      select: { nacionalidad: true },
    });
    const { valores, faltantes } = await valoresLegalesAnexo(
      ctx,
      { ...persona, nacionalidad: p.nacionalidad },
      anexo,
      filas,
      fecha,
    );
    const relleno = rellenarTextoLegalAnexo(plantilla.contenido, valores);
    if (relleno.faltantes.length || faltantes.length)
      throw reglaDeNegocio(
        `Faltan datos para generar el anexo: ${[...new Set([...relleno.faltantes, ...faltantes])].join(", ")}.`,
      );
    const parrafos = parrafosDePlantilla(relleno.texto).map((s) =>
      s.map((x) => ({ texto: x.tipo === "texto" ? x.texto : x.clave, negrita: x.negrita, cursiva: x.cursiva, faltante: null })),
    );
    return (await generarPdfLaboral({ titulo: plantilla.nombre, marca, parrafos, logo })).bytes;
  }
  const claves = variablesDeDocumento(plantilla.contenido);
  const { valores } = await valoresDePersona(ctx, persona, fecha, claves, documentoUsaVariablesSensibles(plantilla.contenido));
  const relleno = rellenarPlantilla(plantilla.contenido, {
    ...valores,
    "contrato.fecha": fechaDeDocumento(fecha),
    "contrato.motivo_cambio": TITULO_MOTIVO[anexo.motivoCambio] ?? anexo.motivoCambio,
    "contrato.cambios": filas.map((f) => `${f.concepto}: ${f.antes} → ${f.despues}`).join("; ") || null,
  });
  if (relleno.faltantes.length)
    throw reglaDeNegocio(`Faltan datos para generar el anexo: ${relleno.faltantes.map((c) => etiquetaDeVariable(c)).join(", ")}.`);
  return (await generarPdfLaboral({ titulo: plantilla.nombre, marca, parrafos: relleno.parrafos, logo })).bytes;
}
