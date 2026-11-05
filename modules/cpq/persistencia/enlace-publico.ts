import { createHash } from "node:crypto";

import type { Contexto } from "@opai/capabilities";
import { valoresEfectivos } from "@opai/capabilities";

import { CAMPOS_CPQ } from "./supuestos";

/** Módulo del Portal Cliente: con él activo, la cotización llega al cliente por el portal. */
export const MODULO_PORTAL_CLIENTE = "portal_cliente";

/** El enlace guarda solo el hash sha256 del token (64 hex); el token en claro se muestra al crearlo. */
export const hashDeToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * ¿Puede esta empresa compartir cotizaciones por enlace suelto? Decisión de Carlos (4-nov-2026,
 * Opción A): el portal es siempre el camino; el enlace está apagado por defecto y solo se enciende,
 * por ajuste, en empresas SIN el módulo Portal Cliente. Con portal nunca aplica, aunque el ajuste
 * esté en verdadero. Se evalúa en el servidor (capacidades y página pública).
 */
export async function enlacePublicoPermitido(ctx: Contexto): Promise<boolean> {
  if (ctx.modulosActivos.includes(MODULO_PORTAL_CLIENTE)) return false;
  const v = await valoresEfectivos(ctx, CAMPOS_CPQ);
  return v.get("cpq.enlace_publico")?.valor === true;
}
