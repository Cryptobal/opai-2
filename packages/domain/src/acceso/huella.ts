import { createHmac } from "node:crypto";

import type { TipoDocumento } from "./documento";

/** Versión del formato del mensaje firmado. Cambiarlo invalida todas las huellas: solo con migración de datos. */
export const FORMATO_HUELLA = "h1";

export type EntradaHuella = {
  tenantId: string;
  tipo: TipoDocumento | "patente";
  /** `DocumentoNormalizado.clave` o `normalizarPatente`: nunca el texto crudo que escribió el guardia. */
  clave: string;
};

/**
 * Huella de un documento o patente (CAR-78 E4b, Ley 21.719): HMAC-SHA256 con una clave de plataforma. El
 * mensaje separa por formato, empresa y tipo de documento, de modo que el mismo RUN en dos empresas, o un RUN y
 * un pasaporte con igual texto, nunca coinciden. Sin la clave la huella no se puede reconstruir por fuerza bruta
 * (un RUN tiene solo ~10^8 posibilidades). Es determinista: sirve para cruzar listas y detectar duplicados.
 */
export function huellaDocumento(e: EntradaHuella, clave: string | Buffer): string {
  if (!e.tenantId || !e.clave) throw new Error("huella: faltan datos");
  return createHmac("sha256", clave)
    .update(`${FORMATO_HUELLA}\u0000${e.tenantId}\u0000${e.tipo}\u0000${e.clave}`)
    .digest("hex");
}
