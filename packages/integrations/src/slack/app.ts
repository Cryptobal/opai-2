/** Credenciales de la app de Slack «OPAI» del entorno (ADR-093 §9). Solo servidor; nunca salen. */
export type AppSlack = { clientId: string; clientSecret: string; signingSecret: string };

/**
 * La app de Slack registrada en este entorno, o null si falta alguna variable (entonces «Conectar con
 * Slack» no se ofrece y OPAI sigue igual). Las carga Carlos en Vercel; nunca van al repositorio.
 */
export function appSlackDelEntorno(
  env: Record<string, string | undefined> = process.env,
): AppSlack | null {
  const clientId = env["SLACK_CLIENT_ID"]?.trim();
  const clientSecret = env["SLACK_CLIENT_SECRET"]?.trim();
  const signingSecret = env["SLACK_SIGNING_SECRET"]?.trim();
  return clientId && clientSecret && signingSecret
    ? { clientId, clientSecret, signingSecret }
    : null;
}

/** Clave con que se firma el `state` del OAuth (secreto del servidor, el mismo de las sesiones). */
export function claveEstadoOAuthDelEntorno(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env["BETTER_AUTH_SECRET"]?.trim() || null;
}
