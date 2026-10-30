import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";

const CAPACIDADES_MARCA = new Set([
  "core.personas.marcar_no_recontratar",
  "core.personas.quitar_no_recontratar",
]);

/**
 * La marca P1 "No recontratar" es un dato reservado (art. 154 ter del Código del Trabajo; Ley 19.628
 * art. 13 d), modificada por la 21.719): sin `core:personas.no_recontratar.manage`, ni Actividad ni
 * `core.audit.list` muestran que existió (bloqueante del Revisor, 30-oct 15:33 CLT). El motivo nunca
 * aparece en claro ni para quien tiene el permiso: lo redacta `sensibles` de la capacidad.
 */
export function visibleSinNoRecontratar(ctx: Contexto): (f: { capability: string }) => boolean {
  if (ctx.autorizar(PERMISOS_CORE.personasNoRecontratarManage)) return () => true;
  return (f) => !CAPACIDADES_MARCA.has(f.capability);
}
