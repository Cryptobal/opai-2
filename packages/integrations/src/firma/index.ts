// Adaptadores de firma electrónica (firma.md §11, R6, R13, P7). Sin proveedor contratado todavía:
// los factories del entorno devuelven el adaptador falso, nunca claves. El prestador real (sello de
// tiempo/PAdES y verificación de identidad) entra detrás de estas interfaces. CAR-82 · PR 2.
import { entornoAdmiteSelloFalso } from "./entorno";
import { selloFalso, selloNoConfigurado, type Sello } from "./sello";
import { verificacionFalsa, type VerificacionIdentidad } from "./verificacion-identidad";

export { entornoAdmiteSelloFalso } from "./entorno";
export type {
  EvidenciaSello,
  FirmanteEvidencia,
  PdfSellado,
  Sello,
} from "./sello";
export { selloFalso, SelloNoConfigurado, selloNoConfigurado } from "./sello";
export type {
  ResultadoVerificacion,
  SolicitudVerificacion,
  VerificacionIdentidad,
} from "./verificacion-identidad";
export {
  verificacionFalsa,
  VerificacionNoConfigurada,
  verificacionNoConfigurada,
} from "./verificacion-identidad";

/**
 * Sellador del entorno. Hoy no hay prestador contratado (P7): en pruebas y desarrollo se usa el
 * falso; en cualquier otro entorno (producción, preview) falla cerrado al sellar, para no marcar un
 * documento como firmado con un PDF que no es un sello real (B1). Cuando exista el prestador, aquí
 * se elige el adaptador real según la credencial, igual que el resto de integraciones (ADR-027).
 */
export function selloDelEntorno(env: Record<string, string | undefined> = process.env): Sello {
  return entornoAdmiteSelloFalso(env) ? selloFalso() : selloNoConfigurado();
}

/** Verificador de identidad del entorno. Sin proveedor (R13, N2 diferida): se usa el falso. */
export function verificacionDelEntorno(
  _env: Record<string, string | undefined> = process.env,
): VerificacionIdentidad {
  return verificacionFalsa();
}
