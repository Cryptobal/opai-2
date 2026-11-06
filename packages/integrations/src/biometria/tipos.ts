// Contrato neutral de biometría facial (CAR-89 · B4, D-05). Ningún módulo importa un SDK de proveedor:
// el núcleo resuelve el adaptador por empresa y mide cada llamada en `core.consumos`.

/** Bytes de una imagen JPEG o PNG. Nunca se guarda: viaja del dispositivo al proveedor y se descarta. */
export type ImagenRostro = Uint8Array;

export type ResultadoVida = {
  viva: boolean;
  /** 0–1. */
  confianza: number;
  /** Cuadro de referencia de la sesión de vida; sirve para enrolar o verificar y se descarta. */
  imagen: ImagenRostro | null;
};

export type ResultadoRostro = {
  coincide: boolean;
  /** Similitud 0–1 contra el rostro esperado; 0 si el esperado no apareció. */
  similitud: number;
};

export type OpcionesVidaSimulada = { simulacion?: { rostro: string; viva: boolean } | undefined };

export type CodigoErrorBiometria = "sin_rostro" | "calidad" | "credenciales" | "proveedor";

/** Falla del proveedor. El mensaje es genérico: nunca lleva la respuesta cruda ni las credenciales. */
export class ErrorBiometria extends Error {
  constructor(
    readonly codigo: CodigoErrorBiometria,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorBiometria";
  }
}

export interface ProveedorBiometria {
  readonly nombre: "rekognition" | "simulado";
  /** Crea la colección de la empresa si no existe (idempotente). */
  asegurarColeccion(coleccionId: string): Promise<void>;
  /** Borra la colección entera (baja de la empresa). */
  eliminarColeccion(coleccionId: string): Promise<void>;
  /** Abre una sesión de prueba de vida; el dispositivo la completa con la cámara. */
  /** `simulacion` solo la entiende el proveedor simulado (pruebas y QA): fija el «rostro» y si la vida pasa. */
  iniciarVida(opciones?: OpcionesVidaSimulada): Promise<{ sesionId: string }>;
  resultadoVida(sesionId: string): Promise<ResultadoVida>;
  /** Registra un rostro en la colección y devuelve la referencia del proveedor. */
  enrolar(coleccionId: string, externalId: string, imagen: ImagenRostro): Promise<{ rostroId: string }>;
  /**
   * Verificación 1:1: solo decide contra el rostro esperado de la persona del RUT. Cualquier otro
   * rostro de la colección se descarta sin devolverse ni registrarse; nunca identifica a nadie.
   */
  verificar(
    coleccionId: string,
    rostroEsperado: string,
    imagen: ImagenRostro,
    umbral: number,
  ): Promise<ResultadoRostro>;
  eliminarRostro(coleccionId: string, rostroId: string): Promise<void>;
}

/** Nombre de la colección de una empresa: una por empresa, nunca compartida (D-05). */
export const coleccionDe = (tenantId: string): string => `opai-${tenantId}`;
