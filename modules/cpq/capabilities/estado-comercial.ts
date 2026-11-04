import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE, PERMISO_READ } from "./permisos";
import { enlacePublicoPermitido } from "../persistencia/enlace-publico";
import { cotizacionDe } from "./util";

/**
 * Estado «comercial» de una cotización para su ficha: archivada, aceptada, enlace público vigente y
 * puestos pendientes de crear. Una sola lectura para la tarjeta de acciones (compartir, archivar,
 * crear puestos).
 */
export const cotizacionesEstadoComercial = defineCapability({
  id: "cpq.cotizaciones.estado_comercial",
  descripcion:
    "Dice si una cotización está archivada o aceptada, si puede usar enlace público y tiene uno activo (con vencimiento y vistas, sin la URL) y cuántos puestos faltan por crear al ganar.",
  permiso: PERMISO_READ,
  auditarLectura: () => [],
  input: z.object({ id: uuidSchema }),
  output: z.object({
    archivada: z.boolean(),
    aceptada: z.boolean(),
    /** ¿Esta empresa puede usar el enlace suelto? (ajuste encendido y sin Portal Cliente). */
    enlacePermitido: z.boolean(),
    enlace: z
      .object({
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
      enlacePermitido: await enlacePublicoPermitido(ctx),
      // Sin URL: el token no se guarda en claro. Solo quien puede compartir ve que hay un enlace activo.
      enlace: enlace && ctx.autorizar(PERMISO_MANAGE)
        ? {
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
