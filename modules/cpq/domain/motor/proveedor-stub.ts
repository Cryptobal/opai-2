import type { ProveedorCostoEmpleador } from "./tipos";

// STUB hasta 07e M1 en main — TODO(cableado CAR-71)
// Contrato futuro: costoEmpleadorPorPersona(entrada, juego) → costoEmpresaMensualClp, liquidoEstimadoClp, desglose, traza, huellaJuegoDeValores, advertencias.
/** Proveedor vacío de producción: el motor marca costo laboral pendiente y no enviable. */
export const proveedorStubSinSueldos: ProveedorCostoEmpleador = {
  obtener: () => null,
};
