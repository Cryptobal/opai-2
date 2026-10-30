// Verificación de identidad para la firma N2 (firma.md R13): prueba de vida del trabajador enrolado
// o, para externos, cédula vigente + selfie + prueba de vida por un proveedor que contrata OPAI (la
// plataforma). INTERFAZ + adaptador FALSO, sin claves ni proveedor. La firma N2 queda FUERA de este
// PR (decisión de Carlos 29-oct-2026, 22:27 CLT: espera la prueba de vida); esto deja el contrato
// listo para cuando entre. CAR-82 · PR 2.

/** Petición de verificación. OPAI nunca envía ni guarda la imagen; solo recibe el resultado (R13). */
export type SolicitudVerificacion = {
  firmanteId: string;
  /** "trabajador" (enrolado → prueba de vida) o "externo" (cédula + selfie + prueba de vida). */
  tipo: "trabajador" | "externo";
  run: string | null;
};

/** Resultado de la verificación. Nunca la imagen biométrica (dato sensible, Ley 21.719). */
export type ResultadoVerificacion = {
  verificado: boolean;
  metodo: "prueba_vida" | "externa";
  prestador: string;
  /** Referencia opaca del proveedor para la evidencia; nunca datos biométricos. */
  referencia: string | null;
};

export interface VerificacionIdentidad {
  readonly nombre: string;
  readonly disponible: boolean;
  verificar(s: SolicitudVerificacion): Promise<ResultadoVerificacion>;
}

/**
 * Adaptador FALSO: devuelve siempre verificado, de forma determinista, sin proveedor ni biometría
 * real. Solo para pruebas del flujo N2 cuando se habilite. No usa claves ni red.
 */
export function verificacionFalsa(): VerificacionIdentidad {
  return {
    nombre: "falso",
    disponible: true,
    async verificar(s: SolicitudVerificacion): Promise<ResultadoVerificacion> {
      return {
        verificado: true,
        metodo: s.tipo === "trabajador" ? "prueba_vida" : "externa",
        prestador: "falso",
        referencia: `falso:${s.firmanteId}`,
      };
    },
  };
}

/** Error claro cuando no hay proveedor de verificación en un entorno que lo exige (N2 real). */
export class VerificacionNoConfigurada extends Error {
  constructor() {
    super("Verificación de identidad no configurada: falta el proveedor de prueba de vida (R13).");
    this.name = "VerificacionNoConfigurada";
  }
}

/** Verificador de un entorno sin proveedor: falla cerrado al verificar, nunca al construir. */
export function verificacionNoConfigurada(): VerificacionIdentidad {
  return {
    nombre: "no-configurado",
    disponible: false,
    async verificar() {
      throw new VerificacionNoConfigurada();
    },
  };
}
