import { createHash, randomBytes } from "node:crypto";

import type { TenantTx } from "@opai/db";
import { PERMISOS_CORE, type TipoEvidencia } from "@opai/domain";

import type { Contexto } from "../../types";

export const PERMISO_FIRMAS_ENVIAR = PERMISOS_CORE.firmasEnviar;
export const PERMISO_FIRMAS_READ = PERMISOS_CORE.firmasRead;
export const PERMISO_FINIQUITOS = PERMISOS_CORE.finiquitosManage;

/** Hash SHA-256 (hex) de un token de un solo destinatario: nunca se guarda el token en claro (R12). */
export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

/** Token personal de un firmante o del comprobante; viaja una sola vez al canal registrado. */
export function nuevoToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

type Solicitud = { id: string; sha256: string };

/** Datos de un evento de evidencia a registrar (R17). `tipo` es uno de `TIPOS_EVIDENCIA`. */
export type DatosEvidencia = {
  tipo: TipoEvidencia;
  firmanteId?: string | null;
  nivel?: string | null;
  metodo?: string | null;
  sha256?: string | null;
  textoAceptacion?: string | null;
  versionAceptacion?: string | null;
};

/**
 * Registra un hecho inmutable del flujo (R17): un eslabón en la bitácora encadenada del núcleo y la
 * fila de evidencia que lo enlaza, dentro de la misma transacción de la escritura (ADR-052). Los
 * eventos se nombran `documentos.firma.<tipo>` (firma.md §9); la evidencia guarda el tipo corto.
 */
export async function registrarEvidencia(
  ctx: Contexto,
  tx: TenantTx,
  solicitud: Solicitud,
  datos: DatosEvidencia,
): Promise<{ seq: number; hash: string }> {
  const sha256 = datos.sha256 ?? solicitud.sha256;
  const hecho = await ctx.bitacora.registrar(tx, {
    tipo: `documentos.firma.${datos.tipo}`,
    entidadTipo: "solicitud_firma",
    entidadId: solicitud.id,
    payload: {
      tipo: datos.tipo,
      firmanteId: datos.firmanteId ?? null,
      nivel: datos.nivel ?? null,
      metodo: datos.metodo ?? null,
      sha256,
    },
  });
  await tx.evidenciaFirma.create({
    data: {
      tenantId: ctx.tenantId,
      solicitudId: solicitud.id,
      firmanteId: datos.firmanteId ?? null,
      tipo: datos.tipo,
      nivel: datos.nivel ?? null,
      metodo: datos.metodo ?? null,
      sha256,
      textoAceptacion: datos.textoAceptacion ?? null,
      versionAceptacion: datos.versionAceptacion ?? null,
      bitacoraSeq: hecho.seq,
      hash: hecho.hash,
    },
  });
  return hecho;
}
