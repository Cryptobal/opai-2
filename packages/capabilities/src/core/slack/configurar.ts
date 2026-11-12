import { PERMISOS_CORE } from "@opai/domain";
import {
  fusionarSlackConfig,
  slackConfigEfectiva,
  slackConfigParcialSchema,
} from "@opai/integrations";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { estadoSlackSchema, filaIntegracionSlack, PROVEEDOR_SLACK, vistaSlack } from "./comun";

export const slackConfigurar = defineCapability({
  id: "core.slack.configurar",
  descripcion:
    "Cambia la configuración de los avisos a Slack de la empresa: canales (general, pánico, resumen), qué anomalías se avisan, margen de atraso en minutos, pánico (canal, mensaje directo al supervisor, escalamiento a un grupo y sus minutos) y resumen por turno. Solo cambia lo que se manda; lo demás queda como estaba. No conecta ni desconecta Slack.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: slackConfigParcialSchema,
  output: estadoSlackSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, cambio, { dryRun }) {
    const actual = await filaIntegracionSlack(ctx);
    const config = fusionarSlackConfig(slackConfigEfectiva(actual?.config), cambio);
    const grupoId = config.panico.escalarAGrupoId;
    if (grupoId) {
      const grupo = await ctx.db.grupoUsuarios.findFirst({
        where: { id: grupoId, archivadoEn: null },
        select: { id: true },
      });
      if (!grupo)
        throw reglaDeNegocio("El grupo elegido para el escalamiento no existe o está archivado.");
    }
    if (config.panico.escalar && !grupoId) {
      throw reglaDeNegocio("Para escalar el pánico, elige el grupo de usuarios que lo recibe.");
    }
    if (dryRun) return { ...(await vistaSlack(ctx)), config };
    await ctx.transaccion(async (tx) => {
      const datos = {
        config: JSON.parse(JSON.stringify(config)),
        actualizadoPor: ctx.usuario?.id ?? null,
      };
      await tx.integracion.upsert({
        where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: PROVEEDOR_SLACK } },
        // Sin conexión, la fila queda «no_configurada»: guardar preferencias no conecta nada.
        create: {
          tenantId: ctx.tenantId,
          proveedor: PROVEEDOR_SLACK,
          modalidad: "plataforma",
          estado: "no_configurada",
          ...datos,
        },
        update: datos,
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.integracion.actualizada",
        entidadTipo: "integracion",
        entidadId: PROVEEDOR_SLACK,
        payload: {
          proveedor: PROVEEDOR_SLACK,
          accion: actual ? "configuracion" : "configuracion_inicial",
        },
      });
    });
    return vistaSlack(ctx);
  },
});
