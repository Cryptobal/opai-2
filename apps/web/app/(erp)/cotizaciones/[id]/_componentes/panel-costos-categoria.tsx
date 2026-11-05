import type { PuestoOpcion } from "./costos-categoria-fila";

/** Edición de costos por categoría (CAR-162); solo en borrador y con permiso de costos. */
export type CostosEditables = { versionId: string; puestos: PuestoOpcion[]; onGuardado: () => void };
