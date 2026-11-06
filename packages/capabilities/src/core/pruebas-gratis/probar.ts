import { z } from "zod";

import {
  dependenciaFaltante,
  DIAS_PRUEBA_GRATIS,
  entradaCatalogo,
  esIncluidoEnBase,
  esParteFinanzas,
  finDePruebaGratis,
  MODULO_FINANZAS,
  motivoSinPrueba,
  PERMISOS_CORE,
  PLAN_BASE,
  partesConPrecio,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { obtenerModulo } from "../../module";
import { aFecha, hoy } from "../maestros/comun";
import { sembrarModulo } from "../siembras-modulo";

const esUnicidad = (e: unknown) => (e as { code?: string } | null)?.code === "P2002";

export const modulesProbar = defineCapability({
  id: "core.modules.probar",
  descripcion:
    "Activa la prueba gratis de un módulo, o de una parte de Finanzas, para esta empresa: dura 10 días y se desactiva sola (queda en solo lectura, no se borra nada). Cada empresa la usa una sola vez por módulo; si necesita más tiempo, lo extiende OPAI. No crea precios ni cargos.",
  permiso: PERMISOS_CORE.tenantManage,
  input: z.object({ moduloId: z.string().trim().min(1).max(60) }),
  output: z.object({
    moduloId: z.string(),
    nombre: z.string(),
    inicio: z.string(),
    hasta: z.string().describe("Último día de la prueba (aaaa-mm-dd)."),
    dias: z.number().int(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const e = entradaCatalogo(input.moduloId);
    if (!e) throw noEncontrado(`El módulo "${input.moduloId}"`);
    if (e.id === PLAN_BASE) throw reglaDeNegocio("El plan base no tiene prueba gratis.");
    if (esIncluidoEnBase(e.id))
      throw reglaDeNegocio(`${e.nombre} está incluido en el plan base: no necesita prueba.`);
    const parte = esParteFinanzas(e.id);
    const modulo = parte ? MODULO_FINANZAS : e.id;
    if (!obtenerModulo(modulo)) throw noEncontrado(`El módulo "${modulo}"`);
    const tenantId = ctx.tenantId;
    const previa = await ctx.db.pruebaGratis.findFirst({ where: { tenantId, moduloId: e.id } });
    if (previa)
      throw reglaDeNegocio(
        `${e.nombre}: la prueba gratis ya se usó. Pídele a OPAI que la extienda.`,
      );
    const estados = new Map(
      (await ctx.db.tenantModule.findMany({ where: { tenantId } })).map((m) => [
        m.moduloId,
        m.estado,
      ]),
    );
    const motivo = motivoSinPrueba(
      e.id,
      e.nombre,
      estados.get(e.id) ?? null,
      estados.get(MODULO_FINANZAS) ?? null,
    );
    if (motivo) throw reglaDeNegocio(motivo);
    if (parte) {
      // Las dependencias cuentan las partes ya probadas o con precio en esta empresa.
      const ids = [
        ...(await ctx.db.pruebaGratis.findMany({ where: { tenantId } })).map((p) => p.moduloId),
        ...(await ctx.db.cobroCondicion.findMany({ where: { tenantId } })).map((c) => c.moduloId),
      ];
      const falta = dependenciaFaltante(e.id, partesConPrecio(ids));
      if (falta) throw reglaDeNegocio(`${falta}: actívalo primero.`);
    }
    const inicio = hoy();
    const hasta = finDePruebaGratis(inicio);
    const salida = { moduloId: e.id, nombre: e.nombre, inicio, hasta, dias: DIAS_PRUEBA_GRATIS };
    if (dryRun) return salida;
    try {
      await ctx.transaccion(async (tx) => {
        await tx.pruebaGratis.create({
          data: {
            tenantId,
            moduloId: e.id,
            inicio: aFecha(inicio),
            hasta: aFecha(hasta),
            activadaPor: ctx.usuario?.id ?? null,
          },
        });
        // Sin el módulo contratado, la prueba lo pone «en prueba»; con uno ya en prueba (otra parte), no cambia.
        if (!estados.get(modulo)) {
          await tx.tenantModule.upsert({
            where: { tenantId_moduloId: { tenantId, moduloId: modulo } },
            update: { estado: "trial" },
            create: { tenantId, moduloId: modulo, estado: "trial" },
          });
          await sembrarModulo(modulo, tx, tenantId);
        }
        await ctx.eventos.emitir(tx, {
          tipo: "core.prueba_gratis.activada",
          entidadTipo: "modulo",
          payload: { moduloId: e.id, hasta },
        });
      });
    } catch (err) {
      // Doble clic o dos pestañas: la unicidad (empresa, módulo) es la regla «una sola vez».
      if (esUnicidad(err)) throw reglaDeNegocio(`${e.nombre}: la prueba gratis ya se activó.`);
      throw err;
    }
    return salida;
  },
});
