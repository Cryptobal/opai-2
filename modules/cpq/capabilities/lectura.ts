import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import {
  cotizacionSchema,
  estadoSchema,
  listaSchema,
  seccionSchema,
  uuidSchema,
  versionSchema,
} from "./esquemas";
import { PERMISO_READ } from "./permisos";
import { resumenListaDesdeVersion } from "./lista-resumen";
import { cotizacionDe, vistaCotizacion, vistaVersion } from "./util";

const resumenListaSchema = z
  .object({
    semaforo: z.enum(["verde", "amarillo", "rojo"]).optional(),
    margenEfectivoPct: z.number().int().optional(),
    costoPendiente: z.boolean(),
  })
  .optional();

const itemSchema = cotizacionSchema.extend({
  negocioTitulo: z.string().nullable(),
  cuentaTitulo: z.string().nullable(),
  resumenCalculo: resumenListaSchema,
  version: versionSchema.nullable(),
});

export const cotizacionesList = defineCapability({
  auditarLectura: (s) => s.items.flatMap((c) => [c.id, c.negocioId]),
  id: "cpq.cotizaciones.list",
  descripcion:
    "Lista las cotizaciones del tenant con su última versión (estado, moneda, validez y venta mensual), filtrables por negocio y por estado; las archivadas quedan fuera salvo que se pidan (todas o solo ellas).",
  permiso: PERMISO_READ,
  input: listaSchema.extend({
    negocioId: uuidSchema.optional(),
    estado: estadoSchema.optional(),
    incluirArchivadas: z.boolean().default(false),
    soloArchivadas: z.boolean().default(false).describe("Solo las archivadas (filtro «Archivadas»)."),
  }),
  output: z.object({ items: z.array(itemSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filtro: Record<string, unknown> = {};
    if (input.negocioId) filtro["negocioId"] = input.negocioId;
    // Filtro relacional: no carga todas las versiones del tenant solo para filtrar la página.
    if (input.estado) filtro["versiones"] = { some: { estado: input.estado } };
    else if (!input.incluirArchivadas && !input.soloArchivadas)
      filtro["versiones"] = { none: { estado: "archivada" } };
    // Archivar (CPQ v4) es de la cotización: por defecto fuera de la lista; «Archivadas» muestra solo ellas.
    if (input.soloArchivadas) filtro["archivadaEn"] = { not: null };
    else if (!input.incluirArchivadas) filtro["archivadaEn"] = null;
    const filas = await ctx.db.cpqCotizacion.findMany({
      where: filtro,
      orderBy: [{ id: "desc" }],
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const items = filas.slice(0, input.limite);
    const versiones = await ctx.db.cpqVersion.findMany({
      where: { cotizacionId: { in: items.map((c) => c.id) } },
      orderBy: [{ numero: "desc" }],
    });
    const negocios = await ctx.db.negocio.findMany({
      where: { tenantId: ctx.tenantId, id: { in: [...new Set(items.map((c) => c.negocioId))] } },
      select: { id: true, titulo: true, cuenta: { select: { nombre: true } } },
    });
    const negocioMeta = new Map(
      negocios.map((n) => [n.id, { titulo: n.titulo, cuenta: n.cuenta?.nombre ?? null }]),
    );
    return {
      items: items.map((c) => {
        const ultima = versiones.find((v) => v.cotizacionId === c.id);
        const meta = negocioMeta.get(c.negocioId);
        return {
          ...vistaCotizacion(c),
          negocioTitulo: meta?.titulo ?? null,
          cuentaTitulo: meta?.cuenta ?? null,
          resumenCalculo: ultima ? resumenListaDesdeVersion(ctx, ultima) : undefined,
          version: ultima ? vistaVersion(ctx, ultima) : null,
        };
      }),
      siguiente: filas.length > input.limite ? (items.at(-1)?.id ?? null) : null,
    };
  },
});

export const cotizacionesGet = defineCapability({
  auditarLectura: (s) => [s.cotizacion.id, s.cotizacion.negocioId],
  id: "cpq.cotizaciones.get",
  descripcion:
    "Obtiene una cotización con todas sus versiones y, de la versión pedida (por defecto la última), sus secciones por instalación y sus líneas; costos y margen solo con permiso de costos.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema, version: z.number().int().min(1).optional() }),
  output: z.object({
    cotizacion: cotizacionSchema,
    versiones: z.array(versionSchema),
    secciones: z.array(seccionSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cotizacionDe(ctx, input.id);
    const versiones = await ctx.db.cpqVersion.findMany({
      where: { cotizacionId: c.id },
      orderBy: [{ numero: "desc" }],
    });
    const elegida = input.version
      ? versiones.find((v) => v.numero === input.version)
      : versiones[0];
    if (input.version && !elegida) throw noEncontrado("La versión");
    const secciones = elegida
      ? await ctx.db.cpqSeccion.findMany({
          where: { versionId: elegida.id },
          orderBy: [{ orden: "asc" }, { id: "asc" }],
        })
      : [];
    const lineas = await ctx.db.cpqLinea.findMany({
      where: { seccionId: { in: secciones.map((s) => s.id) } },
      orderBy: [{ orden: "asc" }, { id: "asc" }],
    });
    return {
      cotizacion: vistaCotizacion(c),
      versiones: versiones.map((v) => vistaVersion(ctx, v)),
      secciones: secciones.map((s) => ({
        id: s.id,
        instalacionId: s.instalacionId,
        nombre: s.nombre,
        lineas: lineas
          .filter((l) => l.seccionId === s.id)
          .map((l) => ({
            id: l.id,
            tipo: l.tipo as "puesto" | "item" | "adicional",
            grupo: l.grupo,
            nombre: l.nombre,
            posiciones: l.posiciones,
            recurrencia: l.recurrencia as "mensual" | "unico",
            habilitada: l.habilitada,
            visibleCliente: l.visibleCliente,
          })),
      })),
    };
  },
});
