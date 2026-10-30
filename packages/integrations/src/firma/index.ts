// Adaptadores de firma electrónica (firma.md §11, R6, R13, P7). Sin proveedor contratado todavía:
// los factories del entorno devuelven el adaptador falso, nunca claves. El prestador real (sello de
// tiempo/PAdES y verificación de identidad) entra detrás de estas interfaces. CAR-82 · PR 2.
import { selloFalso, type Sello } from "./sello";
import { verificacionFalsa, type VerificacionIdentidad } from "./verificacion-identidad";

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
 * Sellador del entorno. Hoy no hay prestador contratado (P7): se usa el falso. Cuando exista, aquí
 * se elige el adaptador real según la credencial, igual que el resto de integraciones (ADR-027).
 */
export function selloDelEntorno(_env: Record<string, string | undefined> = process.env): Sello {
  return selloFalso();
}

/** Verificador de identidad del entorno. Sin proveedor (R13, N2 diferida): se usa el falso. */
export function verificacionDelEntorno(
  _env: Record<string, string | undefined> = process.env,
): VerificacionIdentidad {
  return verificacionFalsa();
}
