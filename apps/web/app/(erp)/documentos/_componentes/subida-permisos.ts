import { PERMISOS_CORE } from "@opai/domain";

import type { EntidadVinculable } from "@/app/_components/documentos/tipos";

export type OpcionesSubida = {
  puedeSubir: boolean;
  /** Entidades a las que puede vincular lo que sube (la capacidad de subida vuelve a decidirlo). */
  vinculables: EntidadVinculable[];
  /** Solo sube a instalaciones a su cargo y sin visibilidad en portales (`documentos.subir_alcance`). */
  acotada: boolean;
};

/**
 * Qué ofrece «Subir» en el explorador según los permisos efectivos. Con `documentos.manage` (y sin
 * ser supervisor: sube desde las fichas de sus instalaciones) ofrece empresa, cuenta, instalación y
 * persona según los permisos de lectura de cada lista. Con solo `documentos.subir_alcance` (CAR-182,
 * decisión de Carlos del 4-nov-2026) ofrece únicamente «Instalación», y exige tener alcance por
 * filas: es una ayuda visual, la capacidad de subida decide con `ctx.alcance` (ADR-022).
 */
export function opcionesDeSubida(
  puede: (permiso: string) => boolean,
  rol: string | null | undefined,
  tieneAlcance: boolean,
): OpcionesSubida {
  if (puede(PERMISOS_CORE.documentosManage)) {
    return {
      puedeSubir: rol !== "supervisor",
      vinculables: [
        "tenant",
        ...(puede(PERMISOS_CORE.cuentasRead) ? (["cuenta"] as const) : []),
        ...(puede(PERMISOS_CORE.instalacionesRead) ? (["instalacion"] as const) : []),
        ...(puede(PERMISOS_CORE.personasRead) ? (["persona"] as const) : []),
      ],
      acotada: false,
    };
  }
  const acotada =
    tieneAlcance &&
    puede(PERMISOS_CORE.documentosSubirAlcance) &&
    puede(PERMISOS_CORE.instalacionesRead);
  return { puedeSubir: acotada, vinculables: acotada ? ["instalacion"] : [], acotada };
}
