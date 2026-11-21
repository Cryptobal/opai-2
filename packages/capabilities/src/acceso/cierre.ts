import { randomUUID } from "node:crypto";

import { z } from "zod";

import { configEfectiva } from "@opai/domain";

import { defineTrabajo } from "../trabajos/registro";
import type { Contexto } from "../types";
import { parsearConfig } from "./config-comun";

/** Deja una salida «cierre» con la hora del servidor a cada registro abierto de la instalación (R25). */
export async function cerrarAbiertos(
  ctx: Contexto,
  instalacionId: string,
  motivo: string,
  registradaPor: string | null,
  soloContar = false,
): Promise<number> {
  const abiertos = await ctx.db.registroAcceso.findMany({
    where: { instalacionId, salida: null, anulacion: null },
    select: { id: true },
    take: 5_000,
  });
  if (soloContar || abiertos.length === 0) return abiertos.length;
  const ahora = new Date();
  // skipDuplicates: si la portería cerró uno al mismo tiempo, su salida manda y este no se duplica.
  const r = await ctx.db.salidaAcceso.createMany({
    skipDuplicates: true,
    data: abiertos.map((a) => ({
      tenantId: ctx.tenantId,
      instalacionId,
      registroId: a.id,
      clave: randomUUID(),
      origen: "cierre",
      registradaPor,
      motivo,
      horaCorregida: ahora,
    })),
  });
  return r.count;
}

/**
 * Cierre automático (R25): cada hora, en las instalaciones cuya configuración fija esa hora local de cierre, cierra
 * a quienes siguen en sitio con el motivo «salida no registrada». `hora` es la del tenant (`AAAA-MM-DDTHH`).
 */
export const trabajoCierreAutomatico = defineTrabajo({
  tipo: "acceso.registros.cierre_automatico",
  descripcion:
    "Cierra a la hora configurada los registros de acceso que siguen abiertos en cada instalación.",
  periodicidad: "horaria",
  payload: z.object({ hora: z.string() }),
  async handler(ctx, { hora }) {
    if (!ctx.modulosActivos.includes("acceso")) return { cerradas: 0 };
    const h = Number(hora.slice(11, 13)) % 24;
    const [configs, abiertas] = await Promise.all([
      ctx.db.configAcceso.findMany({ select: { instalacionId: true, valor: true } }),
      ctx.db.registroAcceso.findMany({
        where: { salida: null, anulacion: null },
        distinct: ["instalacionId"],
        select: { instalacionId: true },
      }),
    ]);
    const de = (id: string | null) => {
      const f = configs.find((c) => c.instalacionId === id);
      return f ? parsearConfig(f.valor) : null;
    };
    const empresa = de(null);
    let cerradas = 0;
    for (const { instalacionId } of abiertas) {
      if (configEfectiva(empresa, de(instalacionId)).cierreHora !== h) continue;
      cerradas += await cerrarAbiertos(
        ctx,
        instalacionId,
        "Salida no registrada (cierre automático)",
        null,
      );
    }
    return { cerradas };
  },
});
