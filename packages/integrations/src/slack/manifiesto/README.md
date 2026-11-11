# App de Slack «OPAI» (ADR-093, CAR-290)

Una sola app de Slack, distribuida a todos los tenants y mantenida por OPAI. Cada empresa la instala en su espacio desde Configuración › Integraciones › Slack (F1, CAR-291). Plan completo en [`docs/2.0/briefs/BRIEF-slack.md`](../../../../../docs/2.0/briefs/BRIEF-slack.md).

| Archivo             | App                 | Host           | Espacio Slack                                     |
| ------------------- | ------------------- | -------------- | ------------------------------------------------- |
| `opai.json`         | «OPAI», distribuida | `app.opai.cl`  | El de cada empresa que la instale                 |
| `opai-pruebas.json` | «OPAI (pruebas)»    | `test.opai.cl` | Solo el espacio de pruebas. **Nunca** el de Gard. |

Los dos tienen los mismos scopes, eventos y ajustes; solo cambian el nombre y las URLs. `manifiesto.test.ts` (en `pnpm test`) lo verifica contra `manifiesto.ts`.

## Crear o actualizar la app (lo hace Carlos)

1. En api.slack.com › Your Apps › Create New App › From an app manifest, elegir el espacio que será dueño de la app y pegar el JSON. Para una app existente: App Manifest › pegar y guardar.
2. **Solo para `opai.json`:** Manage Distribution › activar la distribución pública, para que otras empresas la puedan instalar con OAuth.
3. Copiar de Basic Information el Client ID, el Client Secret y el Signing Secret a las variables de entorno de Vercel del entorno que corresponda: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` y `SLACK_SIGNING_SECRET`. **Nunca** al repositorio, a un PR, a Linear ni a un chat.
4. No instalar la app en el espacio de Gard para pruebas.

## Por qué estos scopes

| Scope                            | Para qué                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `chat:write`                     | Publicar los avisos, editarlos (`chat.update`) y avisos efímeros a quien no puede actuar.    |
| `im:write`                       | Abrir el mensaje directo al supervisor (avisos personales y pánico, si el tenant lo activa). |
| `users:read`, `users:read.email` | Vincular al usuario OPAI con su usuario de Slack por correo (`users.lookupByEmail`).         |
| `channels:read`                  | Listar canales públicos para que el tenant elija dónde se avisa.                             |
| `channels:history`               | Recibir las respuestas en los hilos de los avisos (evento `message.channels`).               |
| `files:write`                    | Adjuntar la foto del aviso, si existe.                                                       |

Eventos: `message.channels` (respuestas en hilos), `app_uninstalled` y `tokens_revoked` (OPAI marca la integración como desconectada). Sin `chat:write.public` (la app solo escribe donde la invitan), sin canales privados ni mensajes directos entrantes y sin scopes de usuario. La pestaña de mensajes de la app es de solo lectura: nadie conversa con el bot. La rotación de tokens queda apagada porque Slack no deja desactivarla después; se reevalúa en F1.
