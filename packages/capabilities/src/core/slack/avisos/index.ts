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
