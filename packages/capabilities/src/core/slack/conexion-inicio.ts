import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import {
  appSlackDelEntorno,
  claveEstadoOAuthDelEntorno,
  firmarEstadoOAuth,
  urlAutorizacionSlack,
  verificarEstadoOAuth,
} from "@opai/integrations";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { urlVueltaSlack } from "./conexion-comun";

export function appYClave() {
  const app = appSlackDelEntorno();
  const clave = claveEstadoOAuthDelEntorno();
  if (!app || !clave) throw reglaDeNegocio("Slack no está disponible en este entorno.");
  return { app, clave };
}

/** Verifica que el `state` sea de esta persona y de su empresa activa (anti-CSRF del OAuth). */
export function exigirEstado(ctx: Contexto, clave: string, estado: string) {
  const e = verificarEstadoOAuth(clave, estado);
  if (!e || !ctx.usuario || e.t !== ctx.tenantId || e.u !== ctx.usuario.id) {
    throw prohibido(
      "El enlace de Slack no corresponde a esta sesión. Vuelve a pulsar «Conectar con Slack».",
    );
  }
}

export const slackIniciarConexion = defineCapability({
  id: "core.slack.iniciar_conexion",
  // OAuth: lo hace una persona en su navegador, nunca una key (ADR-027, ADR-093).
  soloPersonas: true,
  descripcion:
    "Entrega el enlace a Slack para instalar la app «OPAI» en el espacio de la empresa (OAuth). El enlace vale 10 minutos y solo para quien lo pidió.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({}),
  output: z.object({ url: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const { app, clave } = appYClave();
    if (!ctx.usuario) throw prohibido("Conectar Slack lo hace una persona con sesión.");
    const estado = firmarEstadoOAuth(clave, { tenantId: ctx.tenantId, userId: ctx.usuario.id });
    return {
      url: urlAutorizacionSlack({
        clientId: app.clientId,
        redirectUri: urlVueltaSlack(ctx),
        estado,
      }),
    };
  },
});
