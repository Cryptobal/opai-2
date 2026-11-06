// Contrato del adaptador de biometría (CAR-78 · B4, ADR-079). Enrolar, verificar 1:1 con prueba de vida y
// borrar. OPAI nunca guarda la imagen ni la plantilla: el proveedor devuelve una referencia opaca, y esa
// referencia es lo único que se conserva (cifrada) mientras el consentimiento esté vigente (Ley 21.719).

/** Muestra capturada por la cámara del equipo, ya codificada. Se envía al proveedor y se descarta. */
export type Muestra = string;

export type ResultadoEnrolamientoFacial = {
  /** Referencia opaca del proveedor. Nunca la imagen ni la plantilla biométrica. */
  referencia: string;
  proveedor: string;
};

export type ResultadoVerificacionFacial = {
  /** La cara de la muestra corresponde a la enrolada (1:1). */
  coincide: boolean;
  /** La muestra es de una persona presente, no de una foto o pantalla. */
  vivo: boolean;
  /** Similitud entre 0 y 100. */
  puntaje: number;
  proveedor: string;
};

export type MotivoBiometria = "muestra_invalida" | "sin_prueba_de_vida" | "referencia_inexistente";

/** Falla esperable del proveedor (muestra ilegible, sin prueba de vida, referencia ya borrada). */
export class BiometriaError extends Error {
  constructor(
    readonly motivo: MotivoBiometria,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "BiometriaError";
  }
}

export interface Biometria {
  readonly nombre: string;
  readonly disponible: boolean;
  /** Enrola al sujeto. Falla con `sin_prueba_de_vida` si la muestra no es de una persona presente. */
  enrolar(s: { sujetoId: string; muestra: Muestra }): Promise<ResultadoEnrolamientoFacial>;
  /** Verifica 1:1 contra la referencia enrolada, con prueba de vida. */
  verificar(s: { referencia: string; muestra: Muestra }): Promise<ResultadoVerificacionFacial>;
  /** Borra la referencia en el proveedor. Idempotente: borrar lo ya borrado no falla. */
  borrar(referencia: string): Promise<void>;
}
