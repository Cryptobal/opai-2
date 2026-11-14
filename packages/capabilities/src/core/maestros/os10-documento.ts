import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import { filtroDocumentoSensible } from "../documentos/sensibles";

/** Código del tipo de documento de la credencial OS-10 en el catálogo base (`@opai/domain` catalogos). */
export const CODIGO_OS10 = "os10";

/**
 * Respaldo documental del OS-10 de una persona (CAR-429): el documento disponible más reciente
 * (mayor versión, mismo criterio que la Matriz de documentos) del tipo `os10` que la persona tiene
 * como propietaria. Sin `documentos.read` no se informa (roles personalizados). Es la fuente del vencimiento; el dato
 * manual de la ficha solo vale mientras no exista. Respeta el filtro de documentos sensibles y
 * no expone el nombre del archivo, solo el id (para enlazar a Documentos) y sus fechas.
 */
export async function respaldoOs10(ctx: Contexto, personaId: string) {
  if (!ctx.autorizar(PERMISOS_CORE.documentosRead)) return null;
  const doc = await ctx.db.documento.findFirst({
    where: {
      estado: "disponible",
      archivadoEn: null,
      tipo: { codigo: CODIGO_OS10 },
      vinculos: { some: { entidadTipo: "persona", entidadId: personaId, rol: "propietario" } },
      ...filtroDocumentoSensible(ctx),
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    select: { id: true, emitidoEn: true, venceEn: true },
  });
  if (!doc) return null;
  return {
    documentoId: doc.id,
    emitidoEn: doc.emitidoEn ? doc.emitidoEn.toISOString().slice(0, 10) : null,
    venceEn: doc.venceEn ? doc.venceEn.toISOString().slice(0, 10) : null,
  };
}
