import { z } from "zod";

import { ESTADOS_COTIZACION } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_READ, cotizacionDe, estadoSchema, veCostos } from "./comun";
import { resumenSchema, versionSchema, vistaResumen, vistaVersion } from "./vistas";
import {
  aprobacionSchema,
  lineaSchema,
  seccionSchema,
  vistaAprobacion,
  vistaLinea,
  vistaSeccion,
} from "./vistas-detalle";

/** Lista de cotizaciones del tenant con su última versión (venta y estado; costos solo con R59). */
export const cotizacionesList = defineCapability({
  auditarLectura: (s) => s.items.map((i) => i.id),
  id: "cpq.cotizaciones.list",
  descripcion:
    "Lista las cotizaciones de la empresa con su código CPQ-AAAA-NNN, negocio, estado, versión vigente, moneda, validez y venta mensual; costo y margen solo para quien tiene permiso de ver costos.",
  permiso: PERMISO_READ,
  input: z.object({
    negocioId: uuidSchema.optional().describe("Solo las cotizaciones de este negocio."),
    estados: z.array(estadoSchema).max(ESTADOS_COTIZACION.length).optional(),
    incluirArchivadas: z.boolean().default(false),
    limite: z.number().int().min(1).max(200).default(50),
    despuesDe: uuidSchema.optional().describe("Cursor: id de la última cotización recibida."),
  }),
  output: z.object({ items: z.array(resumenSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const estados = input.estados?.length
      ? input.estados
      : ESTADOS_COTIZACION.filter((e) => input.incluirArchivadas || e !== "archivada");
    const filas = await ctx.db.cotizacion.findMany({
      where: {
        estado: { in: [...estados] },
        ...(input.negocioId ? { negocioId: input.negocioId } : {}),
        ...(input.despuesDe ? { id: { lt: input.despuesDe } } : {}),
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
    });
    const pagina = filas.slice(0, input.limite);
    const versiones = pagina.length
      ? await ctx.db.versionCotizacion.findMany({
          where: { cotizacionId: { in: pagina.map((c) => c.id) } },
          orderBy: { numero: "desc" },
        })
      : [];
    const costos = veCostos(ctx);
    const items = pagina.flatMap((c) => {
      const v = versiones.find((x) => x.cotizacionId === c.id);
      return v ? [vistaResumen(c, v, costos)] : [];
    });
    const siguiente = filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null;
    return { items, siguiente };
  },
});

/** Ficha de una cotización: versiones, y secciones, líneas y aprobaciones de la última (R59). */
export const cotizacionesGet = defineCapability({
  auditarLectura: (s) => [s.id, s.negocioId],
  id: "cpq.cotizaciones.get",
  descripcion:
    "Ficha de una cotización: código, título, negocio, estado, sus versiones y, de la última, las secciones por instalación, las líneas y las aprobaciones; sueldos, costos y margen solo con permiso de ver costos.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: resumenSchema.extend({
    versiones: z.array(versionSchema),
    secciones: z.array(seccionSchema),
    lineas: z.array(lineaSchema),
    aprobaciones: z.array(aprobacionSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cotizacionDe(ctx, input.id);
    const versiones = await ctx.db.versionCotizacion.findMany({
      where: { cotizacionId: c.id },
      orderBy: { numero: "desc" },
    });
    const ultima = versiones[0];
    if (!ultima) throw new Error("Cotización sin versión.");
    const [secciones, lineas, aprobaciones] = await Promise.all([
      ctx.db.seccionCotizacion.findMany({ where: { versionId: ultima.id }, orderBy: { orden: "asc" } }),
      ctx.db.lineaCotizacion.findMany({ where: { versionId: ultima.id }, orderBy: { orden: "asc" } }),
      ctx.db.aprobacionCotizacion.findMany({
        where: { versionId: ultima.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const costos = veCostos(ctx);
    return {
      ...vistaResumen(c, ultima, costos),
      versiones: versiones.map((v) => vistaVersion(v, costos)),
      secciones: secciones.map(vistaSeccion),
      lineas: lineas.map((l) => vistaLinea(l, costos)),
      aprobaciones: aprobaciones.map((a) => vistaAprobacion(a, costos)),
    };
  },
});
