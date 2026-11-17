import {
  accesoDeMembresia,
  INCLUIR_ACCESO,
  PERMISOS_CORE,
  tienePermisoEfectivo,
} from "@opai/domain";

import type { Contexto } from "../../types";
import { NIVELES_VERSION_ANEXO, sinAnexo } from "../documentos/sensibles";
import type { Destinatario } from "./destinatarios";

/**
 * Si el documento es el final de un anexo de contrato (R15) o una versión suya, como la copia
 * firmada (CAR-512): trae datos de sueldo.
 */
export async function esDocumentoDeAnexo(ctx: Contexto, documentoId: string): Promise<boolean> {
  return (
    (await ctx.db.documento.count({
      where: { id: documentoId, NOT: sinAnexo(NIVELES_VERSION_ANEXO) },
    })) > 0
  );
}

/**
 * De los destinatarios de un aviso, solo los que pueden ver el documento del anexo: `anexos.read` o
 * `estructuras.read_sensible` efectivos (rol base o personalizado + excepciones, ADR-022), el mismo
 * criterio de `filtroDocumentoSensible`. Así el aviso no le revela el nombre del documento a nadie
 * que no podría abrirlo.
 */
export async function conAccesoAnexo(
  ctx: Contexto,
  para: readonly Destinatario[],
): Promise<Destinatario[]> {
  if (!para.length) return [];
  const membresias = await ctx.db.membership.findMany({
    where: { estado: "activa", userId: { in: para.map((p) => p.id) } },
    include: INCLUIR_ACCESO,
  });
  const permitidos = new Set(
    membresias
      .filter((m) => {
        // Igual que en la sesión: rol (archivado deniega), excepciones y roles que se suman.
        const acceso = accesoDeMembresia(m);
        return (
          tienePermisoEfectivo(acceso, PERMISOS_CORE.anexosRead) ||
          tienePermisoEfectivo(acceso, PERMISOS_CORE.estructurasReadSensible)
        );
      })
      .map((m) => m.userId),
  );
  return para.filter((p) => permitidos.has(p.id));
}
