import { z } from "zod";

/**
 * App de Slack «OPAI» (ADR-093, CAR-290). Una sola app, distribuida a todos los tenants. Los manifiestos
 * versionados en esta carpeta (`opai.json` y `opai-pruebas.json`) deben coincidir con estas constantes:
 * lo verifica `manifiesto.test.ts`. Cambiar un scope es una decisión que se registra en ADR-093.
 */

/** Scopes mínimos del bot. Sin `chat:write.public`, sin canales privados ni lectura de mensajes directos. */
export const SLACK_SCOPES_BOT = [
  "channels:history",
  "channels:read",
  "chat:write",
  "files:write",
  "im:write",
  "users:read",
  "users:read.email",
] as const;

/** Eventos del bot: respuestas en hilos de canales públicos y desinstalación o revocación del token. */
export const SLACK_EVENTOS_BOT = ["app_uninstalled", "message.channels", "tokens_revoked"] as const;

/**
 * Rutas de OPAI que recibe la app, en `apps/web/app/api/integraciones/slack/`: `oauth` y una `eventos` mínima
 * (verificación de URL y desinstalación) en F1, `acciones` en F4 y las respuestas en hilos de `eventos` en F5a.
 */
export const SLACK_RUTAS = {
  oauth: "/api/integraciones/slack/oauth/callback",
  eventos: "/api/integraciones/slack/eventos",
  acciones: "/api/integraciones/slack/acciones",
} as const;

/** Hosts de OPAI admitidos en un manifiesto: la app distribuida y la de pruebas. */
export const SLACK_HOSTS = { produccion: "app.opai.cl", pruebas: "test.opai.cl" } as const;

const urlHttps = z.url({ protocol: /^https$/ });

/** Forma estricta del manifiesto: cualquier clave no prevista (por ejemplo, scopes de usuario) lo invalida. */
export const manifiestoSlackSchema = z
  .object({
    display_information: z
      .object({ name: z.string().min(1).max(35), description: z.string().min(1).max(140) })
      .strict(),
    features: z
      .object({
        app_home: z
          .object({
            home_tab_enabled: z.literal(false),
            messages_tab_enabled: z.boolean(),
            messages_tab_read_only_enabled: z.literal(true),
          })
          .strict(),
        bot_user: z
          .object({
            display_name: z.string().regex(/^[a-z0-9._-]{1,80}$/),
            always_online: z.literal(false),
          })
          .strict(),
      })
      .strict(),
    oauth_config: z
      .object({
        redirect_urls: z.array(urlHttps).length(1),
        scopes: z.object({ bot: z.array(z.string()) }).strict(),
      })
      .strict(),
    settings: z
      .object({
        event_subscriptions: z
          .object({ request_url: urlHttps, bot_events: z.array(z.string()) })
          .strict(),
        interactivity: z.object({ is_enabled: z.literal(true), request_url: urlHttps }).strict(),
        org_deploy_enabled: z.literal(false),
        socket_mode_enabled: z.literal(false),
        token_rotation_enabled: z.literal(false),
      })
      .strict(),
  })
  .strict();

export type ManifiestoSlack = z.infer<typeof manifiestoSlackSchema>;
