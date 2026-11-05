import type { EtiquetaChip } from "@opai/ds";

export type EntidadEtiquetable = "negocio" | "cuenta" | "contacto";

/** Fila de `core.etiquetas.list` / `de_entidad`. */
export type EtiquetaFila = EtiquetaChip & { activa: boolean };
