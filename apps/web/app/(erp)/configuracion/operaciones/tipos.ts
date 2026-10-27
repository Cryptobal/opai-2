// Tipos de la sección Configuración › Patrones de turno y Funciones (Brief 11). Reflejan el output
// de `core.patrones.list` y `core.funciones.list`.

export type Patron = {
  id: string;
  nombre: string;
  clase: string;
  diasTrabajo: number;
  diasDescanso: number;
  diasSemana: number[];
  resumen: string;
  diasPorSemana: number;
  deFabrica: boolean;
  activo: boolean;
  orden: number;
  puestosActivos: number;
};

export type Funcion = {
  id: string;
  nombre: string;
  vertical: string | null;
  activo: boolean;
  orden: number;
  puestosActivos: number;
};

export type Tab = "patrones" | "funciones";

/** Conteo en singular cuando es 1 (decisión de Carlos del PR #49). */
export function conteoPuestos(n: number): string {
  return `${n} ${n === 1 ? "puesto" : "puestos"}`;
}

/** Días 1–7 (lunes a domingo) abreviados para la vista semanal. */
export const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;
