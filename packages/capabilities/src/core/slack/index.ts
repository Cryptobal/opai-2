// Slack F1 (CAR-291, ADR-093): conexión por empresa y configuración de avisos. F2 (CAR-292): vínculo
// de personas por correo y mensajes directos. Apagado por defecto:
// sin conexión no se envía nada y OPAI se comporta igual.
import { slackConectar } from "./conexion";
import { slackIniciarConexion } from "./conexion-inicio";
import { slackCanales, slackEstado } from "./consultas";
import { slackConfigurar } from "./configurar";
import { slackDesconectar, slackDesinstalada } from "./desconexion";
import { trabajoMensajeDirectoSlack } from "./mensaje-directo";
import { slackUsuariosList, slackVincularUsuarios } from "./usuarios";
import {
  consumidorSlackConectada,
  consumidorSlackMiembroNuevo,
  trabajoVincularUsuariosSlack,
} from "./vinculo-trabajos";

export { encolarMensajeDirecto } from "./mensaje-directo";

export const capacidadesSlack = [
  slackEstado,
  slackCanales,
  slackConfigurar,
  slackIniciarConexion,
  slackConectar,
  slackDesconectar,
  slackDesinstalada,
  slackUsuariosList,
  slackVincularUsuarios,
] as const;

/** Trabajos de Slack F2 (CAR-292): vínculo de personas y mensajes directos. */
export const trabajosSlack = [trabajoVincularUsuariosSlack, trabajoMensajeDirectoSlack];
export const consumidoresSlack = [consumidorSlackConectada, consumidorSlackMiembroNuevo];
