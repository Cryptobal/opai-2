import { createHash } from "node:crypto";

import { bytesDeXml, xmlDesdeBytes, type AdaptadorCesion, type AdaptadorSii } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export function claveXmlDte(documentoId: string): string {
  return `dte/${documentoId}.xml`;
}

/** `clave` opcional: una clave provisional única por intento, para no pisar el XML de un documento ya emitido. */
export async function guardarXmlFirmadoDte(
  ctx: Contexto,
  documentoId: string,
  xml: string,
  clave: string = claveXmlDte(documentoId),
): Promise<void> {
  if (!ctx.servicios.almacenamiento.disponible) {
    throw reglaDeNegocio("Configure el almacenamiento para guardar el XML firmado del DTE.");
  }
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

/** Borra, sin fallar, el XML de un intento que no llegó a confirmarse (contiene datos del receptor, Ley 21.719). */
export async function descartarXmlPreparado(ctx: Contexto, clave: string | null): Promise<void> {
  if (!clave || !ctx.servicios.almacenamiento.disponible) return;
  await ctx.servicios.almacenamiento.eliminar(clave).catch(() => undefined);
}
