import { clienteSlackMensajes } from "@opai/integrations";

/** Cliente de mensajes de Slack. Las pruebas reemplazan `fetch` global: nunca se llama a Slack real. */
export const slackMensajes = () => clienteSlackMensajes((url, init) => fetch(url, init));
