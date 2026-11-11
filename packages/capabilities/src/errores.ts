import type { CodigoError } from "./types";

/**
 * Error de negocio con código. Un handler lo lanza para responder con un código claro
 * (409 si ya existe, 422 si viola una regla, 404 si no está) en vez de INTERNAL.
 */
export class ErrorCapacidad extends Error {
  readonly code: CodigoError;
  /** Datos estructurados opcionales del error (p. ej. la lista de permisos que no se pueden conceder). */
  readonly detalles?: unknown;

  constructor(code: CodigoError, message: string, detalles?: unknown) {
    super(message);
    this.name = "ErrorCapacidad";
    this.code = code;
    this.detalles = detalles;
  }
}

export const noEncontrado = (que: string) => new ErrorCapacidad("NOT_FOUND", `${que} no existe.`);
export const conflicto = (mensaje: string) => new ErrorCapacidad("CONFLICT", mensaje);
export const reglaDeNegocio = (mensaje: string, detalles?: unknown) =>
  new ErrorCapacidad("UNPROCESSABLE", mensaje, detalles);
export const prohibido = (mensaje: string, detalles?: unknown) =>
  new ErrorCapacidad("FORBIDDEN", mensaje, detalles);

/** Rechazo que debe registrarse tras revertir la transacción de negocio. */
export class RechazoSensible extends ErrorCapacidad {
  constructor(mensaje: string) {
    super("FORBIDDEN", mensaje);
  }
}
export const rechazoSensible = (mensaje: string) => new RechazoSensible(mensaje);

/**
 * Error inesperado con un motivo ya saneado para el log de `error_interno` (CAR-242): la persona sigue viendo el
 * mensaje genérico con la correlación, y el log dice qué paso falló, sin input, secretos ni datos del documento.
 */
export class ErrorConMotivo extends Error {
  readonly motivoSeguro: string;

  constructor(motivoSeguro: string, options?: { cause?: unknown }) {
    super(motivoSeguro, options);
    this.name = "ErrorConMotivo";
    this.motivoSeguro = motivoSeguro;
  }
}
