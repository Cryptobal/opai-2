import { biometriaSimulada } from "./simulado";
import type { Biometria } from "./tipos";

export type {
  Biometria,
  MotivoBiometria,
  Muestra,
  ResultadoEnrolamientoFacial,
  ResultadoVerificacionFacial,
} from "./tipos";
export { BiometriaError } from "./tipos";
export { biometriaSimulada } from "./simulado";

/** Pruebas y desarrollo local son los únicos entornos que admiten el proveedor simulado. */
export function entornoAdmiteBiometriaSimulada(env: Record<string, string | undefined>): boolean {
  return env["NODE_ENV"] === "test" || env["NODE_ENV"] === "development";
}

/** Error claro cuando un entorno exige biometría y no hay proveedor contratado. */
export class BiometriaNoConfigurada extends Error {
  constructor() {
    super("Biometría no configurada: falta contratar el proveedor de reconocimiento facial.");
    this.name = "BiometriaNoConfigurada";
  }
}

/** Adaptador de un entorno sin proveedor: falla cerrado al usarse, nunca al construirse. */
export function biometriaNoConfigurada(): Biometria {
  const falla = async (): Promise<never> => {
    throw new BiometriaNoConfigurada();
  };
  return {
    nombre: "no-configurado",
    disponible: false,
    enrolar: falla,
    verificar: falla,
    borrar: falla,
  };
}

// El simulado es único por proceso: lo enrolado en una llamada se verifica en la siguiente.
const simulado = biometriaSimulada();

/**
 * Biometría del entorno. Sin proveedor contratado (D-03/D-04 abiertas) solo pruebas y desarrollo usan el
 * simulado; en producción o preview falla cerrado, para no dar por verificada a una persona sin un
 * proveedor real (ADR-079). Cuando exista el proveedor, aquí se elige según la credencial del tenant.
 */
export function biometriaDelEntorno(
  env: Record<string, string | undefined> = process.env,
): Biometria {
  return entornoAdmiteBiometriaSimulada(env) ? simulado : biometriaNoConfigurada();
}
