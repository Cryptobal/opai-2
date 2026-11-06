import { createHash } from "node:crypto";

import { bytesDeXml, xmlDesdeBytes, type AdaptadorCesion, type AdaptadorSii } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export function claveXmlDte(documentoId: string): string {
  return `dte/${documentoId}.xml`;
}

export async function guardarXmlFirmadoDte(ctx: Contexto, documentoId: string, xml: string): Promise<void> {
  if (!ctx.servicios.almacenamiento.disponible) {
    throw reglaDeNegocio("Configure el almacenamiento para guardar el XML firmado del DTE.");
  }
  const clave = claveXmlDte(documentoId);
  // ADR-075: el XML firmado es ISO-8859-1 y se guarda como esos mismos bytes; el SHA-256 se calcula sobre ellos.
  const bytes = bytesDeXml(xml);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await ctx.servicios.almacenamiento.subir(clave, bytes, "application/xml; charset=ISO-8859-1", sha256);
}

export async function leerXmlFirmadoDte(ctx: Contexto, xmlStorageKey: string | null): Promise<string> {
  if (!xmlStorageKey) throw reglaDeNegocio("Falta el XML firmado guardado del DTE.");
  const alm = ctx.servicios.almacenamiento;
  if (!alm.disponible) throw reglaDeNegocio("No hay almacenamiento configurado para leer el XML del DTE.");
  const existe = await alm.head(xmlStorageKey);
  if (!existe) throw reglaDeNegocio("Falta el XML firmado guardado del DTE.");
  const bytes = await alm.leerBytes(xmlStorageKey);
  if (!bytes || bytes.length === 0) throw reglaDeNegocio("Falta el XML firmado guardado del DTE.");
  return xmlDesdeBytes(bytes);
}

export async function xmlParaEnvioSii(
  ctx: Contexto,
  doc: { folio: number | null; xmlStorageKey: string | null },
  adaptador: AdaptadorSii,
): Promise<string> {
  if (adaptador.nombre === "simulado") return `<DTE folio="${doc.folio}"/>`;
  return leerXmlFirmadoDte(ctx, doc.xmlStorageKey);
}

export async function xmlBase64ParaCesion(
  ctx: Contexto,
  doc: { folio: number | null; xmlStorageKey: string | null },
  adaptador: AdaptadorCesion | AdaptadorSii,
): Promise<string> {
  const xml =
    adaptador.nombre === "simulado"
      ? `<DTE folio="${doc.folio}"/>`
      : await leerXmlFirmadoDte(ctx, doc.xmlStorageKey);
  // Los mismos bytes del XML firmado (latin1 ↔ bytes sin pérdida), nunca recodificados a UTF-8 (ADR-075).
  return bytesDeXml(xml).toString("base64");
}
