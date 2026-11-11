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
import { guardarSecretoTx } from "../../integraciones/secretos";
import type { Contexto } from "../../types";
import {
  errorDeSlack,
  estadoSlackSchema,
  instalacionSlack,
  PROVEEDOR_SLACK,
  SECRETO_TOKEN_SLACK,
  slack,
  vistaSlack,
} from "./comun";
import { revocarSinFallar, urlVueltaSlack } from "./conexion-comun";

function appYClave() {
  const app = appSlackDelEntorno();
  const clave = claveEstadoOAuthDelEntorno();
  if (!app || !clave) throw reglaDeNegocio("Slack no está disponible en este entorno.");
  return { app, clave };
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

async function guardarInstalacion(
  ctx: Contexto,
  inst: Awaited<ReturnType<ReturnType<typeof slack>["intercambiarCodigo"]>>,
) {
  await ctx.transaccion(async (tx) => {
    const fila = await tx.integracion.upsert({
      where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: PROVEEDOR_SLACK } },
      create: {
        tenantId: ctx.tenantId,
        proveedor: PROVEEDOR_SLACK,
        modalidad: "plataforma",
        estado: "configurada",
        actualizadoPor: ctx.usuario?.id ?? null,
      },
      update: {
        modalidad: "plataforma",
        estado: "configurada",
        ultimoError: null,
        actualizadoPor: ctx.usuario?.id ?? null,
      },
    });
    const datos = {
      teamId: inst.teamId,
      teamNombre: inst.teamNombre.slice(0, 200),
      botUserId: inst.botUserId,
      appId: inst.appId,
    };
    await tx.slackInstalacion.upsert({
      where: { tenantId: ctx.tenantId },
      create: { tenantId: ctx.tenantId, instaladoPor: ctx.usuario?.id ?? null, ...datos },
      update: datos,
    });
    await guardarSecretoTx(tx, ctx, fila.id, SECRETO_TOKEN_SLACK, inst.token);
    await ctx.eventos.emitir(tx, {
      tipo: "core.integracion.actualizada",
      entidadTipo: "integracion",
      entidadId: PROVEEDOR_SLACK,
      payload: { proveedor: PROVEEDOR_SLACK, accion: "conectada" },
    });
  });
}

export const slackConectar = defineCapability({
  id: "core.slack.conectar",
  soloPersonas: true,
  descripcion:
    "Completa la instalación de Slack al volver del OAuth: canjea el código, guarda el token del bot cifrado y liga el espacio a la empresa. Un espacio de Slack se liga a una sola empresa.",
  permiso: PERMISOS_CORE.integracionesManage,
  // El código y el estado del OAuth nunca llegan a la auditoría.
  sensibles: ["code", "estado"],
  input: z.object({ code: z.string().min(8).max(500), estado: z.string().min(16).max(512) }),
  output: estadoSlackSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { app, clave } = appYClave();
    const e = verificarEstadoOAuth(clave, input.estado);
    if (!e || !ctx.usuario || e.t !== ctx.tenantId || e.u !== ctx.usuario.id) {
      throw prohibido(
        "El enlace de Slack no corresponde a esta sesión. Vuelve a pulsar «Conectar con Slack».",
      );
    }
    if (dryRun) return vistaSlack(ctx);
    let inst;
    try {
      inst = await slack().intercambiarCodigo({
        clientId: app.clientId,
        clientSecret: app.clientSecret,
        code: input.code,
        redirectUri: urlVueltaSlack(ctx),
      });
    } catch (err) {
      throw errorDeSlack(err);
    }
    const actual = await instalacionSlack(ctx);
    if (actual && actual.teamId !== inst.teamId) {
      await revocarSinFallar(inst.token);
      throw reglaDeNegocio(
        `La empresa ya está conectada a otro espacio de Slack («${actual.teamNombre}»). Desconéctalo primero.`,
      );
    }
    try {
      await guardarInstalacion(ctx, inst);
    } catch (err) {
      await revocarSinFallar(inst.token);
      if ((err as { code?: unknown } | null)?.code === "P2002") {
        throw reglaDeNegocio("Ese espacio de Slack ya está conectado a otra empresa de OPAI.");
      }
      throw err;
    }
    return vistaSlack(ctx);
  },
});
