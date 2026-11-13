// Slack simulado para las pruebas de core.slack.* (CAR-291). Nunca se llama a Slack real ni al de Gard.
import { randomBytes } from "node:crypto";
import { vi } from "vitest";

import { firmarEstadoOAuth, SLACK_SCOPES_BOT } from "@opai/integrations";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";

export const CLAVE = "clave-de-sesiones-de-prueba";
export const TOKEN = "xoxb-token-de-prueba-123";
const VARIABLES = [
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_SIGNING_SECRET",
  "BETTER_AUTH_SECRET",
];

export const llamadas: { metodo: string; auth: string | null }[] = [];
export const respuestas: Record<string, unknown> = {};

export const instalacion = (team = "T0PRUEBA1") => ({
  ok: true,
  access_token: TOKEN,
  token_type: "bot",
  scope: SLACK_SCOPES_BOT.join(","),
  bot_user_id: "U0BOT1",
  app_id: "A0APP1",
  team: { id: team, name: "Espacio de pruebas" },
});

export const estadoValido = () =>
  firmarEstadoOAuth(CLAVE, { tenantId: TENANT_DE_PRUEBA, userId: USUARIO_DE_PRUEBA.id });

/** Registra el núcleo, fija la app de Slack del entorno y reemplaza `fetch` por el Slack simulado. */
export function prepararSlack() {
  if (!process.env["OPAI_SECRETS_KEY"])
    process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  Object.assign(process.env, {
    SLACK_CLIENT_ID: "1.2",
    SLACK_CLIENT_SECRET: "cs",
    SLACK_SIGNING_SECRET: "ss",
    BETTER_AUTH_SECRET: CLAVE,
  });
  llamadas.length = 0;
  for (const k of Object.keys(respuestas)) delete respuestas[k];
  Object.assign(respuestas, {
    "oauth.v2.access": instalacion(),
    "auth.revoke": { ok: true, revoked: true },
  });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const metodo = url.replace("https://slack.com/api/", "");
    llamadas.push({ metodo, auth: new Headers(init.headers).get("authorization") });
    const valor = respuestas[metodo];
    // Respuesta por cuerpo (p. ej. un usuario distinto por correo en `users.lookupByEmail`).
    const r =
      typeof valor === "function"
        ? (valor as (c: URLSearchParams) => unknown)(new URLSearchParams(String(init.body)))
        : valor;
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r ?? { ok: false, error: "unknown_method" }));
  });
}

export function limpiarSlack() {
  vi.unstubAllGlobals();
  for (const k of VARIABLES) delete process.env[k];
}

/** Conecta Slack en un contexto de prueba (owner con sesión). */
export async function conectarSlack(ctx = contextoDePrueba().ctx) {
  const r = await executeCapability(ctx, "core.slack.conectar", {
    code: "codigo-oauth-1",
    estado: estadoValido(),
  });
  return { ctx, r };
}
