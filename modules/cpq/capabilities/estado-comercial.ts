import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE, PERMISO_READ } from "./permisos";
import { urlDeEnlace } from "./compartir";
import { cotizacionDe } from "./util";

/**
 * Estado «comercial» de una cotización para su ficha: archivada, aceptada, enlace público vigente y
 * puestos pendientes de crear. Una sola lectura para la tarjeta de acciones (compartir, archivar,
 * crear puestos).
 */
export const cotizacionesEstadoComercial = defineCapability({
  id: "cpq.cotizaciones.estado_comercial",
  descripcion:
    "Dice si una cotización está archivada o aceptada, si tiene un enlace público activo (con vencimiento y vistas) y cuántos puestos faltan por crear al ganar.",
  permiso: PERMISO_READ,
  auditarLectura: () => [],
  input: z.object({ id: uuidSchema }),
  output: z.object({
    archivada: z.boolean(),
    aceptada: z.boolean(),
    enlace: z
      .object({
        url: z.string(),
        venceEn: z.date(),
        vistas: z.number().int(),
        ultimaVistaEn: z.date().nullable(),
        vencido: z.boolean(),
      })
      .nullable(),
    puestosPendientes: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cotizacionDe(ctx, input.id);
    const [aceptada, enlace] = await Promise.all([
      ctx.db.cpqVersion.findFirst({
        where: { cotizacionId: c.id, estado: "aceptada" },
        orderBy: { numero: "desc" },
        select: { id: true },
      }),
      ctx.db.cpqEnlaceCompartido.findFirst({
        where: { cotizacionId: c.id, revocadoEn: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    let puestosPendientes = 0;
    if (aceptada) {
      const lineas = await ctx.db.cpqLinea.findMany({
        where: { tipo: "puesto", habilitada: true, seccion: { versionId: aceptada.id } },
        select: { id: true, posiciones: true },
      });
      const hechos = await ctx.db.cpqPuestoCreado.groupBy({
        by: ["lineaId"],
        where: { lineaId: { in: lineas.map((l) => l.id) } },
        _count: { _all: true },
      });
      const n = new Map(hechos.map((h) => [h.lineaId, h._count._all]));
      puestosPendientes = lineas.reduce((t, l) => t + Math.max(l.posiciones - (n.get(l.id) ?? 0), 0), 0);
    }
    return {
      archivada: c.archivadaEn !== null,
      aceptada: aceptada !== null,
      // El enlace es una credencial: solo lo ve quien puede compartir (no un lector).
      enlace: enlace && ctx.autorizar(PERMISO_MANAGE)
        ? {
            url: await urlDeEnlace(ctx, enlace.token),
            venceEn: enlace.venceEn,
            vistas: enlace.vistas,
            ultimaVistaEn: enlace.ultimaVistaEn,
            vencido: enlace.venceEn.getTime() <= Date.now(),
          }
        : null,
      puestosPendientes,
    };
  },
});
