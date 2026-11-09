import { biometriaBorrar } from "./borrado";
import { biometriaEnrolar } from "./enrolamiento";
import { biometriaEstado } from "./estado";
import { biometriaVerificar } from "./verificacion";

export { consumidorRevocacionBiometria } from "./revocacion";

export const capacidadesBiometria = [
  biometriaEnrolar,
  biometriaVerificar,
  biometriaEstado,
  biometriaBorrar,
];

export { borrarEnrolamiento } from "./borrado";
export { enrolarRostro } from "./enrolamiento";
export { evaluarRostro, verificarRostro, type ResultadoRostro } from "./verificacion";
export { PROPOSITO_BIOMETRIA, consentimientoVigente as consentimientoBiometricoVigente } from "./comun";
