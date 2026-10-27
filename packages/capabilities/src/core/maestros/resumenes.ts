// Datos de resumen por fila para las listas (una consulta por página, nunca por fila).
import { z } from "zod";

import { estadoVigencia } from "@opai/domain";

import type { Contexto } from "../../types";
import { dia, hoy } from "./comun";

export const alertasSchema = z
  .object({ vencidos: z.number(), porVencer: z.number() })
  .describe("Documentos vencidos y por vencer (30 días) de la ficha.");

/** Puestos activos y dotación (suma) por instalación. */
export async function resumenInstalaciones(ctx: Contexto, ids: string[]) {
  const g = await ctx.db.puesto.groupBy({
    by: ["instalacionId"],
    where: { instalacionId: { in: ids }, estado: "activo" },
    _count: { _all: true },
    _sum: { dotacion: true },
  });
  const m = new Map(
    g.map((x) => [x.instalacionId, { puestos: x._count._all, dotacion: x._sum.dotacion ?? 0 }]),
  );
  return (id: string) => m.get(id) ?? { puestos: 0, dotacion: 0 };
}

/** Documentos vencidos y por vencer de cada entidad (por su vínculo de propietario), en una consulta. */
export async function alertasDocumentos(ctx: Contexto, tipo: string, ids: string[]) {
  const vinculos = await ctx.db.documentoVinculo.findMany({
    where: {
      entidadTipo: tipo,
      entidadId: { in: ids },
      rol: "propietario",
      documento: { estado: "disponible", venceEn: { not: null } },
    },
    select: { entidadId: true, documento: { select: { venceEn: true } } },
  });
  return resumirAlertasDocumentos(vinculos);
}

/** Resumen puro para consultas consolidadas que ya cargaron los vencimientos. */
export function resumirAlertasDocumentos(
  vinculos: { entidadId: string; documento: { venceEn: Date | null } }[],
) {
  const r = new Map<string, { vencidos: number; porVencer: number }>();
  for (const v of vinculos) {
    const e = estadoVigencia(dia(v.documento.venceEn), hoy(), 30);
    const a = r.get(v.entidadId) ?? { vencidos: 0, porVencer: 0 };
    if (e === "vencido") a.vencidos++;
    if (e === "por_vencer") a.porVencer++;
    r.set(v.entidadId, a);
  }
  return (id: string) => r.get(id) ?? { vencidos: 0, porVencer: 0 };
}
