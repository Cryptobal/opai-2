// Datos de resumen por fila para las listas (una consulta por página, nunca por fila).
import { z } from "zod";

import { estadoVigencia } from "@opai/domain";

import type { Contexto } from "../../types";
import { dia, hoy } from "./comun";

export const alertasSchema = z
  .object({ vencidos: z.number(), porVencer: z.number() })
  .describe("Documentos vencidos y por vencer (30 días) de la ficha.");

/** Instalaciones activas y contacto principal por cuenta. */
export async function resumenCuentas(ctx: Contexto, ids: string[]) {
  const [inst, principales] = await Promise.all([
    ctx.db.instalacion.groupBy({
      by: ["cuentaId"],
      where: { cuentaId: { in: ids }, archivadaEn: null },
      _count: { _all: true },
    }),
    ctx.db.contacto.findMany({
      where: { cuentaId: { in: ids }, esPrincipal: true, archivadoEn: null },
      select: { cuentaId: true, nombres: true, apellidos: true },
    }),
  ]);
  const n = new Map(inst.map((g) => [g.cuentaId, g._count._all]));
  const p = new Map(principales.map((c) => [c.cuentaId, `${c.nombres} ${c.apellidos}`]));
  return (id: string) => ({ instalaciones: n.get(id) ?? 0, contactoPrincipal: p.get(id) ?? null });
}

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

/** Documentos vencidos y por vencer de cada entidad (por su vínculo de propietario). */
export async function alertasDocumentos(ctx: Contexto, tipo: string, ids: string[]) {
  const vinculos = await ctx.db.documentoVinculo.findMany({
    where: { entidadTipo: tipo, entidadId: { in: ids }, rol: "propietario" },
    select: { documentoId: true, entidadId: true },
  });
  const docs = await ctx.db.documento.findMany({
    where: {
      id: { in: vinculos.map((v) => v.documentoId) },
      estado: "disponible",
      venceEn: { not: null },
    },
    select: { id: true, venceEn: true },
  });
  const estado = new Map(docs.map((d) => [d.id, estadoVigencia(dia(d.venceEn), hoy(), 30)]));
  const r = new Map<string, { vencidos: number; porVencer: number }>();
  for (const v of vinculos) {
    const e = estado.get(v.documentoId);
    const a = r.get(v.entidadId) ?? { vencidos: 0, porVencer: 0 };
    if (e === "vencido") a.vencidos++;
    if (e === "por_vencer") a.porVencer++;
    r.set(v.entidadId, a);
  }
  return (id: string) => r.get(id) ?? { vencidos: 0, porVencer: 0 };
}
