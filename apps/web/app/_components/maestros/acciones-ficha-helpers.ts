import type { AccionEntidad } from "./acciones-entidad";

/** Quita «Editar» del menú ⋯ cuando ya va visible en la cabecera (CAR-546). */
export function accionesSinEditar(acciones: AccionEntidad[]): AccionEntidad[] {
  return acciones.filter((a) => a.id !== "editar" && !a.id.startsWith("editar-"));
}