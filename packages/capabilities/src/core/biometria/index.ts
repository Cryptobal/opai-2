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
