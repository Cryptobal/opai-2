import type { SlackConfig } from "@opai/integrations";

export type ConfigSlack = SlackConfig;

/** Lo que devuelve core.slack.estado (sin token ni team_id). */
export type EstadoSlack = {
  disponible: boolean;
  conectada: boolean;
  espacio: string | null;
  conectadaEn: string | null;
  config: ConfigSlack;
};

export type Grupo = { id: string; nombre: string; archivado: boolean };
export type Canal = { id: string; nombre: string; esMiembro: boolean };

/** Formulario de la configuración: lo envía «Guardar» de la barra superior. */
export const FORM_SLACK = "form-slack";

/** Motivos que vuelven del OAuth (`?slack=error&motivo=…`), en palabras simples. */
export const MOTIVOS: Record<string, string> = {
  cancelado: "Cancelaste la instalación en Slack. No se conectó nada.",
  enlace: "El enlace de Slack venció o no es de esta sesión. Vuelve a pulsar «Conectar con Slack».",
  sesion: "Tu sesión terminó. Ingresa de nuevo y vuelve a conectar.",
  limite: "Hubo demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.",
  otro_espacio: "La empresa ya está conectada a otro espacio de Slack. Desconéctalo primero.",
  espacio_ocupado: "Ese espacio de Slack ya está conectado a otra empresa de OPAI.",
  permisos_incompletos:
    "Slack no entregó todos los permisos de la app. Vuelve a conectar y acéptalos.",
  instalacion_de_organizacion:
    "OPAI se instala en un espacio de Slack, no en toda la organización.",
};
