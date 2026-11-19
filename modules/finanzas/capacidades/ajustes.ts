import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { sincronizarAvisosEnTx } from "./aviso";
import { ajustesSchema } from "./esquemas";
import { PERMISO_CONFIGURAR, PERMISO_VER } from "./permisos";
import { ajustesDe } from "./util";

export const ajustesObtener = defineCapability({
  id: "finanzas.ajustes.obtener",
  descripcion:
    "Entrega los ajustes del flujo de caja (umbral, calendario y aviso). No incluye cobranza ni facturación; esos viven en la pestaña Ajustes del módulo Finanzas.",
  permiso: PERMISO_VER,
  input: z.object({}),
  output: ajustesSchema,
  efecto: "lectura",
  dryRun: false,
  handler: (ctx) => ajustesDe(ctx),
});

export const ajustesActualizar = defineCapability({
  id: "finanzas.ajustes.actualizar",
  descripcion:
    "Fija umbral, calendario y aviso del flujo de caja; la planilla recalcula con ellos. Distinto de las reglas de cobranza y facturación en Configuración › Módulos › Finanzas › Ajustes.",
  permiso: PERMISO_CONFIGURAR,
  input: ajustesSchema.partial(),
  output: ajustesSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ajustesDe(ctx);
    const nuevo = { ...actual, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) };
    if (dryRun) return nuevo;
    await ctx.transaccion(async (tx) => {
      const data = {
        umbral: BigInt(nuevo.umbral),
        horizonteSemanas: nuevo.horizonteSemanas,
        calendarioPagos: nuevo.calendarioPagos,
        avisoActivo: nuevo.avisoActivo,
        metaCeldaMs: nuevo.metaCeldaMs,
        metaGuardadoP95Ms: nuevo.metaGuardadoP95Ms,
        metaCargaInicialS: nuevo.metaCargaInicialS,
        metasVisibles: nuevo.metasVisibles,
      };
      const existe = await tx.flujoAjustes.findFirst({});
      const a = existe
        ? await tx.flujoAjustes.update({ where: { id: existe.id }, data })
        : await tx.flujoAjustes.create({ data: { ...data, tenantId: ctx.tenantId } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.ajustes_cambiados",
        entidadTipo: "flujoAjustes",
        entidadId: a.id,
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
    });
    return nuevo;
  },
});
