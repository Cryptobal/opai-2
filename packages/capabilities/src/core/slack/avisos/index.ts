// Slack F3 (CAR-293, ADR-093): avisos de terreno a Slack.
import { consumidorSlackAusencia, consumidorSlackMarcas } from "./consumidores";
import { consumidorSlackIncidentes, consumidorSlackPanico } from "./consumidores-terreno";
import { trabajoEnviarAvisoSlack } from "./enviar";
import { avisosTerrenoCerrar, avisosTerrenoPedirRefuerzo, avisosTerrenoTomar } from "./gestion";
import { trabajoActualizarAvisoSlack, trabajoRefuerzoAvisoSlack } from "./gestion-slack";
import { avisosTerrenoList } from "./lista";
import { trabajoDirectoPanicoSlack, trabajoEscalarPanicoSlack } from "./panico";

export const trabajosAvisosSlack = [
  trabajoEnviarAvisoSlack,
  trabajoDirectoPanicoSlack,
  trabajoEscalarPanicoSlack,
  trabajoActualizarAvisoSlack,
  trabajoRefuerzoAvisoSlack,
];
export const capacidadesAvisosTerreno = [
  avisosTerrenoList,
  avisosTerrenoTomar,
  avisosTerrenoCerrar,
  avisosTerrenoPedirRefuerzo,
];
export const consumidoresAvisosSlack = [
  consumidorSlackMarcas,
  consumidorSlackAusencia,
  consumidorSlackIncidentes,
  consumidorSlackPanico,
];
export { registrarAvisoSlack, TIPOS_AVISO, type TipoAviso } from "./registrar";
export {
  ACCION_CERRAR,
  ACCION_REFUERZO,
  ACCION_RESPONDER,
  ACCION_TOMAR,
  bloquesAviso,
} from "./bloques";
