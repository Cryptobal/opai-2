// CAF guardado listo para emitir (CAR-240). Lo usan la emisión y el preflight: descifra el CAF del rango, lo lee en sus
// bytes ISO-8859-1 (nunca como UTF-8) y comprueba que esté íntegro, que sea del RUT emisor y que cubra el tipo y el
// folio, como el `checkCaf` de OPAI 1.0. Nunca devuelve ni registra el XML; solo dice qué falló.
import { leerCafXml, normalizarRut } from "@opai/domain";
import { bytesCafParaGuardar, cafXmlDesdeGuardado, descifrar, diagnosticarCafGuardado } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import { dekDe } from "../integraciones/secretos";
import type { Contexto } from "../types";

export type FalloCafGuardado = "no_encontrado" | "ilegible" | "danado" | "rut_distinto" | "no_corresponde";

export type CafGuardado = { ok: true; xml: string } | { ok: false; fallo: FalloCafGuardado };

/** Mensajes para la persona: dicen qué hacer y nunca muestran el contenido del CAF. */
export const MENSAJE_FALLO_CAF: Record<FalloCafGuardado, string> = {
  no_encontrado: "No se encontró el CAF guardado para este folio; vuelva a cargar el CAF antes de emitir.",
  ilegible: "No se pudo leer el CAF guardado de este folio; vuelva a cargar el CAF antes de emitir.",
  danado:
    "El CAF de este folio se guardó dañado (perdió tildes o eñes al cargarlo); vuelva a cargar el archivo CAF antes de emitir.",
  rut_distinto:
    "El CAF de este folio está autorizado para otro RUT que el emisor configurado; cargue el CAF de esta empresa o revise el RUT emisor en Finanzas › Configuración DTE.",
  no_corresponde: "El CAF guardado no cubre el tipo o el folio que se va a emitir; vuelva a cargar el CAF antes de emitir.",
};

/**
 * Lee y valida el CAF del secreto `cafSecretoId`. La DEK queda fuera del try: una caída de base o una KEK ausente
 * siguen siendo INTERNAL, no «recargue el CAF».
 */
export async function cafGuardadoParaEmitir(
  ctx: Contexto,
  p: { cafSecretoId: string; rutEmisor: string; tipoDte: number; folio: number },
): Promise<CafGuardado> {
  const s = await ctx.db.secreto.findFirst({ where: { id: p.cafSecretoId, tenantId: ctx.tenantId } });
  if (!s) return { ok: false, fallo: "no_encontrado" };
  const dek = await dekDe(ctx);
  let bytes: Buffer;
  try {
    bytes = descifrar(dek, { cifrado: s.cifrado, iv: s.iv, tag: s.tag });
  } catch {
    return { ok: false, fallo: "ilegible" };
  }
  const xml = cafXmlDesdeGuardado(bytes);
  if (xml === null) return { ok: false, fallo: "danado" };
  const lectura = leerCafXml(xml);
  if (!lectura) return { ok: false, fallo: "ilegible" };
  // Como `caf_rut_mismatch` de 1.0: un CAF de otro RUT no sirve para timbrar el DTE; se corta antes de llamar a SimpleAPI.
  if (lectura.rutEmisor !== normalizarRut(p.rutEmisor)) return { ok: false, fallo: "rut_distinto" };
  if (lectura.tipoDte !== p.tipoDte || p.folio < lectura.folioDesde || p.folio > lectura.folioHasta) {
    return { ok: false, fallo: "no_corresponde" };
  }
  return { ok: true, xml };
}

/**
 * El CAF se guarda en sus bytes ISO-8859-1, los mismos que firmó el SII (CAR-240). Un texto con caracteres fuera de
 * ese juego no viene del archivo original (p. ej. tildes perdidas en U+FFFD) y SimpleAPI lo rechazaría.
 */
export function bytesCafOError(cafXml: string): Buffer {
  const b = bytesCafParaGuardar(cafXml);
  // También los bytes de U+FFFD (EF BF BD): un editor que abrió el CAF como UTF-8 y lo guardó ya perdió las tildes.
  if (!b || diagnosticarCafGuardado(b).tieneReemplazo) {
    throw reglaDeNegocio(
      "El archivo CAF trae caracteres que no son ISO-8859-1 (tildes o eñes dañadas); cargue el archivo original que entregó el SII.",
    );
  }
  return b;
}
