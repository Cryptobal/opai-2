import { z } from "zod";

import {
  appSlackDelEntorno,
  clienteSlack,
  ErrorSlack,
  slackConfigEfectiva,
  slackConfigSchema,
} from "@opai/integrations";

import { reglaDeNegocio } from "../../errores";
import { externo } from "../../externo";
import { leerSecreto } from "../../integraciones/secretos";
import type { Contexto } from "../../types";
import { iso } from "../comun";

/** Proveedor del catálogo y nombre del secreto del token del bot (ADR-093 §9). */
export const PROVEEDOR_SLACK = "slack";
export const SECRETO_TOKEN_SLACK = "bot_token";

/** Cliente HTTP de Slack. Las pruebas reemplazan `fetch` global: nunca se llama a Slack real. */
export const slack = () => clienteSlack((url, init) => fetch(url, init));

export const estadoSlackSchema = z.object({
  /** false si la app de Slack no está registrada en este entorno: no se puede conectar. */
  disponible: z.boolean(),
  conectada: z.boolean(),
  /** Nombre del espacio de Slack conectado (lo escribe el dueño del espacio: dato externo). */
  espacio: externo(z.string().nullable()),
  conectadaEn: z.string().nullable(),
  config: slackConfigSchema,
});

export async function filaIntegracionSlack(ctx: Contexto) {
  return ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: PROVEEDOR_SLACK } },
  });
}

export async function instalacionSlack(ctx: Contexto) {
  return ctx.db.slackInstalacion.findUnique({ where: { tenantId: ctx.tenantId } });
}

/** Estado visible de Slack para la empresa. Nunca devuelve el token ni el team_id. */
export async function vistaSlack(ctx: Contexto): Promise<z.infer<typeof estadoSlackSchema>> {
  const [fila, inst] = await Promise.all([filaIntegracionSlack(ctx), instalacionSlack(ctx)]);
  return {
    disponible: appSlackDelEntorno() !== null,
    conectada: inst !== null,
    espacio: inst?.teamNombre ?? null,
    conectadaEn: iso(inst?.createdAt),
    config: slackConfigEfectiva(fila?.config),
  };
}

/** Token del bot de ESTA empresa (nunca de otra: la RLS y el tenant del contexto lo garantizan). */
export async function tokenSlack(ctx: Contexto): Promise<string> {
  const fila = await filaIntegracionSlack(ctx);
  const token = fila ? await leerSecreto(ctx, fila.id, SECRETO_TOKEN_SLACK) : null;
  if (!token)
    throw reglaDeNegocio(
      "Slack no está conectado. Conéctalo en Configuración › Integraciones › Slack.",
    );
  return token;
}

const MENSAJES: Record<string, string> = {
  sin_respuesta: "Slack no respondió. Intenta de nuevo en unos minutos.",
  limite_de_slack: "Slack pidió esperar antes de volver a consultar. Intenta en un minuto.",
  invalid_auth: "Slack ya no reconoce la conexión. Desconecta y vuelve a conectar Slack.",
  token_revoked: "La conexión con Slack fue revocada. Vuelve a conectar Slack.",
  account_inactive: "La conexión con Slack fue revocada. Vuelve a conectar Slack.",
  invalid_code: "El enlace de Slack venció o ya se usó. Vuelve a pulsar «Conectar con Slack».",
  code_already_used: "El enlace de Slack venció o ya se usó. Vuelve a pulsar «Conectar con Slack».",
  permisos_incompletos:
    "La instalación no aceptó todos los permisos de la app. Vuelve a conectar y acepta los permisos.",
  instalacion_de_organizacion:
    "OPAI se instala en un espacio de Slack, no en toda la organización.",
};

/** Error de Slack → mensaje de negocio en español. Nunca el cuerpo de Slack ni el token. */
export function errorDeSlack(e: unknown): Error {
  if (!(e instanceof ErrorSlack)) return e instanceof Error ? e : new Error(String(e));
  return reglaDeNegocio(MENSAJES[e.codigo] ?? `Slack rechazó la operación (${e.codigo}).`);
}
