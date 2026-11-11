import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { InstalacionSlack } from "@opai/integrations";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
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
import { urlVueltaSlack } from "./conexion-comun";
import { appYClave, exigirEstado } from "./conexion-inicio";

async function guardarInstalacion(ctx: Contexto, inst: InstalacionSlack) {
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
  // El canje con Slack es una llamada remota: va antes de la transacción de la escritura.
  async preparar(ctx, input) {
    const { app, clave } = appYClave();
    exigirEstado(ctx, clave, input.estado);
    try {
      return await slack().intercambiarCodigo({
        clientId: app.clientId,
        clientSecret: app.clientSecret,
        code: input.code,
        redirectUri: urlVueltaSlack(ctx),
      });
    } catch (err) {
      throw errorDeSlack(err);
    }
  },
  async handler(ctx, input, { dryRun, preparado }) {
    const { clave } = appYClave();
    exigirEstado(ctx, clave, input.estado);
    if (dryRun) return vistaSlack(ctx);
    const inst = preparado as InstalacionSlack | undefined;
    if (!inst)
      throw reglaDeNegocio("No se pudo completar la conexión con Slack. Vuelve a intentar.");
    // En los rechazos NO se revoca el token: con la rotación apagada, reinstalar la app en un espacio
    // devuelve el MISMO token del bot, que puede ser el de otra empresa ya conectada a ese espacio.
    const actual = await instalacionSlack(ctx);
    if (actual && actual.teamId !== inst.teamId) {
      throw reglaDeNegocio(
        "La empresa ya está conectada a otro espacio de Slack. Desconéctalo primero.",
        {
          motivo: "otro_espacio",
        },
      );
    }
    try {
      await guardarInstalacion(ctx, inst);
    } catch (err) {
      if ((err as { code?: unknown } | null)?.code === "P2002") {
        throw reglaDeNegocio("Ese espacio de Slack ya está conectado a otra empresa de OPAI.", {
          motivo: "espacio_ocupado",
        });
      }
      throw err;
    }
    return vistaSlack(ctx);
  },
});
