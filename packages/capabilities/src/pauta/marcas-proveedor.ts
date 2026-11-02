/** Puerto para marcas de Asistencia (CAR-89). Sin integración en PR 2. */
export type ProveedorMarcas = {
  /** Reservado: consultar marcas legales por puesto y fecha. */
  readonly pendiente: true;
};

export const proveedorMarcasPendiente: ProveedorMarcas = { pendiente: true };
