import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";

type Fila = {
  capability: string;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
};

const texto = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Ids de documento que la fila menciona: su entidad, el `id`/`documentoId` de la entrada o los leídos. */
function documentosDe(f: Fila): string[] {
  const payload = (f.payload ?? {}) as { input?: Record<string, unknown>; ids?: unknown };
  const entrada = payload.input ?? {};
  const documental = f.capability.startsWith("core.documentos.");
  // Las lecturas auditadas guardan los ids revelados en `payload.ids` (NÚCLEO-H).
  const leidos = documental && Array.isArray(payload.ids) ? payload.ids.map(texto) : [];
  return [
    f.entityType === "documento" ? f.entityId : null,
    documental ? texto(entrada["id"]) : null,
    texto(entrada["documentoId"]),
    ...leidos,
  ].filter((x): x is string => x !== null);
}

/**
 * Sin `anexos.read` ni `estructuras.read_sensible`, la actividad no muestra los anexos de contrato
 * ni su documento final (nombre, título ni cambios): traen datos de sueldo, y el historial no puede
 * ser una vía lateral para verlos (mismo criterio que `filtroDocumentoSensible`). Una consulta.
 */
export async function visibleSinAnexos(
  ctx: Contexto,
  filas: readonly Fila[],
): Promise<(f: Fila) => boolean> {
  if (
    ctx.autorizar(PERMISOS_CORE.anexosRead) ||
    ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)
  )
    return () => true;
  const ids = [...new Set(filas.flatMap(documentosDe))];
  const deAnexo = new Set(
    ids.length
      ? (
          await ctx.db.anexoContrato.findMany({
            where: { documentoId: { in: ids } },
            select: { documentoId: true },
          })
        ).flatMap((a) => (a.documentoId ? [a.documentoId] : []))
      : [],
  );
  return (f) =>
    !f.capability.startsWith("core.anexos.") &&
    f.entityType !== "anexo" &&
    !documentosDe(f).some((id) => deAnexo.has(id));
}
