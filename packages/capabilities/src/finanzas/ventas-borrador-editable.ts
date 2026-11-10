// Qué borradores se pueden editar o descartar (CAR-248). Solo uno que nunca salió: en borrador, sin folio, sin XML ni
// track ID, sin envíos ni cesiones y que no lo maneje una programación o un cierre mensual. Nunca un documento emitido.
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export const TIPOS_BORRADOR = [33, 34, 56] as const;

/** Carga el borrador y comprueba que siga siendo editable; el mensaje dice por qué no. */
export async function cargarBorradorEditable(ctx: Pick<Contexto, "db">, documentoId: string) {
  const doc = await ctx.db.documentoEmitido.findFirst({
    where: { id: documentoId },
    include: { lineas: { orderBy: { orden: "asc" } }, referencias: true },
  });
  if (!doc) throw noEncontrado("El documento");
  if (doc.estadoDte !== "borrador" || doc.folio != null || doc.trackIdSii || doc.xmlStorageKey) {
    throw reglaDeNegocio("Solo se puede cambiar un borrador sin folio ni envío al SII; un documento emitido no se modifica.");
  }
  if (!(TIPOS_BORRADOR as readonly number[]).includes(doc.tipoDte)) {
    throw reglaDeNegocio("Este tipo de documento no tiene borrador editable.");
  }
  const [corrida, cierre, envios, cesiones, enviosCliente] = await Promise.all([
    ctx.db.ventasProgramacionCorrida.count({ where: { documentoId } }),
    ctx.db.ventasCierreSeguimiento.count({ where: { documentoId } }),
    ctx.db.dteEnvio.count({ where: { documentoId } }),
    ctx.db.cesion.count({ where: { documentoId } }),
    ctx.db.documentoEmitidoEnvio.count({ where: { documentoId } }),
  ]);
  if (corrida > 0 || cierre > 0) {
    throw reglaDeNegocio("Este borrador lo generó una programación o el cierre mensual; se gestiona desde ahí, no se edita ni se descarta aquí.");
  }
  if (envios > 0 || cesiones > 0 || enviosCliente > 0) {
    throw reglaDeNegocio("Este borrador ya tiene envíos registrados; no se puede cambiar ni descartar.");
  }
  return doc;
}

/** Bloquea la fila del documento hasta el fin de la transacción: una emisión o edición concurrente espera. */
export async function bloquearDocumento(
  tx: { $queryRaw: (q: TemplateStringsArray, ...v: unknown[]) => Promise<unknown> },
  tenantId: string,
  documentoId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM finanzas.documentos_emitidos WHERE id = ${documentoId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
}
