import type { CodigoError } from "./types";

/**
 * Error de negocio con código. Un handler lo lanza para responder con un código claro
 * (409 si ya existe, 422 si viola una regla, 404 si no está) en vez de INTERNAL.
 */
export class ErrorCapacidad extends Error {
  readonly code: CodigoError;

  constructor(code: CodigoError, message: string) {
    super(message);
    this.name = "ErrorCapacidad";
    this.code = code;
  }
}

export const noEncontrado = (que: string) => new ErrorCapacidad("NOT_FOUND", `${que} no existe.`);
export const conflicto = (mensaje: string) => new ErrorCapacidad("CONFLICT", mensaje);
export const reglaDeNegocio = (mensaje: string) => new ErrorCapacidad("UNPROCESSABLE", mensaje);
export const prohibido = (mensaje: string) => new ErrorCapacidad("FORBIDDEN", mensaje);
