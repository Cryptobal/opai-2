// Slack F3 (CAR-293, ADR-093): avisos de terreno a Slack.
import { consumidorSlackAusencia, consumidorSlackMarcas } from "./consumidores";
import { consumidorSlackIncidentes, consumidorSlackPanico } from "./consumidores-terreno";
import { trabajoEnviarAvisoSlack } from "./enviar";
import { trabajoDirectoPanicoSlack, trabajoEscalarPanicoSlack } from "./panico";

export const trabajosAvisosSlack = [
  trabajoEnviarAvisoSlack,
  trabajoDirectoPanicoSlack,
  trabajoEscalarPanicoSlack,
];
export const consumidoresAvisosSlack = [
  consumidorSlackMarcas,
  consumidorSlackAusencia,
  consumidorSlackIncidentes,
  consumidorSlackPanico,
];
export { registrarAvisoSlack, TIPOS_AVISO, type TipoAviso } from "./registrar";
export { ACCION_TOMAR, bloquesAviso } from "./bloques";
