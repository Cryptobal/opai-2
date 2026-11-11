// Slack F1 (CAR-291, ADR-093): conexión por empresa y configuración de avisos. Apagado por defecto:
// sin conexión no se envía nada y OPAI se comporta igual.
import { slackConectar, slackIniciarConexion } from "./conexion";
import { slackCanales, slackEstado } from "./consultas";
import { slackConfigurar } from "./configurar";
import { slackDesconectar, slackDesinstalada } from "./desconexion";

export const capacidadesSlack = [
  slackEstado,
  slackCanales,
  slackConfigurar,
  slackIniciarConexion,
  slackConectar,
  slackDesconectar,
  slackDesinstalada,
] as const;
