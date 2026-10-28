import { z } from "zod";
import { listarInstalaciones } from "@opai/db";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion, instalacionesEnAlcance } from "./alcance";
import { listaSchema, pagina } from "./comun";
import { ESTADOS_INSTALACION, instalacionSchema, vistaInstalacion } from "./instalaciones-vista";
import { puestoSchema, vistaPuesto } from "./puestos-vista";

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
  auditarLectura: (s) => s.items.map((i) => i.id),
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
    const filas = await ctx.transaccion((tx) =>
      listarInstalaciones(tx, {
        ...input,
        tenantId: ctx.tenantId!,
        alcance: instalacionesEnAlcance(ctx),
      }),
    );
    const p = pagina(filas, input.limite);
    return {
      items: p.items.map((i) => ({
        ...vistaInstalacion(i, i.cuentaNombre),
        puestos: i.puestos,
        dotacion: i.dotacion,
      })),
      siguiente: p.siguiente,
    };
  },
});

export const instalacionesGet = defineCapability({
  auditarLectura: (s) => [s.id],
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
    const i = await ctx.db.instalacion.findFirst({
      where: { id: input.id, AND: [dondeInstalacion(ctx)] },
      include: {
        cuenta: { select: { nombre: true } },
        puestos: { include: { patron: true, funcion: true }, orderBy: { nombre: "asc" } },
      },
    });
    if (!i) throw noEncontrado("La instalación");
    const documentos = await ctx.db.documentoVinculo.count({
      where: { entidadTipo: "instalacion", entidadId: i.id },
    });
    return {
      ...vistaInstalacion(i, i.cuenta?.nombre ?? null),
      puestos: i.puestos.map(vistaPuesto),
      documentos,
    };
  },
});
