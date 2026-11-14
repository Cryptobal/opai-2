import { grupoPorId } from "./grupos";

/**
 * Cargos y sueldos es un catálogo de Configuración › Operación (CAR-182) con su propia vista
 * dividida. Sus páginas muestran las migas del grupo y vuelven a él en teléfono, para no sacar a la
 * persona de Configuración (CAR-319).
 */
export const GRUPO_CARGOS = grupoPorId("operacion");

export const VOLVER_CARGOS = {
  href: "/configuracion/grupo/operacion",
  etiqueta: GRUPO_CARGOS?.etiqueta ?? "Operación",
};
