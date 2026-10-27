import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion } from "./alcance";
import { cursorDe, listaSchema, pagina } from "./comun";
import { ESTADOS_INSTALACION, instalacionSchema, vistaInstalacion } from "./instalaciones-vista";
import { puestoSchema, vistaPuesto } from "./puestos-vista";
import { resumenInstalaciones } from "./resumenes";

export async function instalacionDe(ctx: Contexto, id: string) {
  // findFirst (no findUnique) para aplicar el alcance por filas: fuera de alcance = no encontrada.
  const i = await ctx.db.instalacion.findFirst({ where: { id, AND: [dondeInstalacion(ctx)] } });
  if (!i) throw noEncontrado("La instalación");
  return i;
}

/** Nombres de cuenta por id (una consulta para toda la página). */
export async function nombresDeCuentas(ctx: Contexto, ids: string[]) {
  const cuentas = await ctx.db.cuenta.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, nombre: true },
  });
  return new Map(cuentas.map((c) => [c.id, c.nombre]));
}

export const instalacionesList = defineCapability({
  id: "core.instalaciones.list",
  descripcion:
    "Lista las instalaciones (sitios donde se presta el servicio) con búsqueda por nombre o comuna y filtros por cuenta, estado y región. Paginada por cursor.",
  permiso: PERMISOS_CORE.instalacionesRead,
  portales: ["erp", "supervisor"],
  input: listaSchema.extend({
    cuentaId: uuidSchema.optional(),
    estado: z.enum(ESTADOS_INSTALACION).optional(),
    region: z.string().max(80).optional(),
  }),
  output: z.object({
    items: z.array(instalacionSchema.extend({ puestos: z.number(), dotacion: z.number() })),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const q = input.q;
    const filas = await ctx.db.instalacion.findMany({
      where: {
        AND: [dondeInstalacion(ctx)],
        ...(input.incluirArchivadas ? {} : { archivadaEn: null }),
        ...(input.cuentaId ? { cuentaId: input.cuentaId } : {}),
        ...(input.estado ? { estado: input.estado } : {}),
        ...(input.region ? { region: input.region } : {}),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" as const } },
                { comuna: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
      // El nombre de la cuenta va en la misma consulta (include), no una aparte por página (ADR-045).
      include: { cuenta: { select: { nombre: true } } },
    });
    const p = pagina(filas, input.limite);
    const resumen = await resumenInstalaciones(
      ctx,
      p.items.map((i) => i.id),
    );
    return {
      items: p.items.map((i) => ({
        ...vistaInstalacion(i, i.cuenta?.nombre ?? null),
        ...resumen(i.id),
      })),
      siguiente: p.siguiente,
    };
  },
});

export const instalacionesGet = defineCapability({
  id: "core.instalaciones.get",
  descripcion:
    "Ficha de una instalación: dirección y coordenadas, geocerca, vigencia, puestos de servicio y cantidad de documentos.",
  permiso: PERMISOS_CORE.instalacionesRead,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema }),
  output: instalacionSchema.extend({ puestos: z.array(puestoSchema), documentos: z.number() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const i = await instalacionDe(ctx, input.id);
    const [nombres, puestos, documentos] = await Promise.all([
      nombresDeCuentas(ctx, [i.cuentaId]),
      ctx.db.puesto.findMany({
        where: { instalacionId: i.id },
        include: { patron: true, funcion: true },
        orderBy: { nombre: "asc" },
      }),
      ctx.db.documentoVinculo.count({ where: { entidadTipo: "instalacion", entidadId: i.id } }),
    ]);
    return {
      ...vistaInstalacion(i, nombres.get(i.cuentaId) ?? null),
      puestos: puestos.map(vistaPuesto),
      documentos,
    };
  },
});
