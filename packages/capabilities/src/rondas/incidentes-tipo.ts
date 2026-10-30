import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { definidos, sinDuplicado } from "../core/maestros/comun";
import { PERMISO_CONFIG, PERMISO_READ, gravedadSchema, tipoIncidenteDe } from "./comun";
import { tipoIncidenteSchema } from "./vistas";

type FilaTipo = {
  id: string;
  nombre: string;
  icono: string | null;
  gravedadDefecto: string;
  activo: boolean;
  orden: number;
};

function vista(t: FilaTipo): z.input<typeof tipoIncidenteSchema> {
  return {
    id: t.id,
    nombre: t.nombre,
    icono: t.icono,
    gravedadDefecto: t.gravedadDefecto as z.infer<typeof gravedadSchema>,
    activo: t.activo,
    orden: t.orden,
  };
}

/** Lista el catálogo de tipos de incidente del tenant (Configuración → Rondas, mockup c15t). */
export const incidentesTipoListar = defineCapability({
  id: "rondas.incidentes_tipo.listar",
  descripcion:
    "Lista el catálogo de tipos de incidente del tenant, con su ícono, gravedad por defecto y si están activos, para la hoja de novedad y la configuración de Rondas.",
  permiso: PERMISO_READ,
  input: z.object({ incluirInactivos: z.boolean().default(false) }),
  output: z.array(tipoIncidenteSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.tipoIncidente.findMany({
      where: input.incluirInactivos ? {} : { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return filas.map(vista);
  },
});

/** Crea un tipo de incidente del tenant con su gravedad por defecto (decisión de Carlos, mockup 1). */
export const incidentesTipoCrear = defineCapability({
  id: "rondas.incidentes_tipo.crear",
  descripcion:
    "Crea un tipo de incidente del tenant con su nombre, ícono, gravedad por defecto (baja, media o alta) y orden, para usarlo al registrar novedades de la ronda.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    nombre: z.string().trim().min(2).max(60),
    icono: z.string().trim().max(40).nullable().optional(),
    gravedadDefecto: gravedadSchema.default("media"),
    orden: z.number().int().min(0).max(99).default(0),
    activo: z.boolean().default(true),
  }),
  output: tipoIncidenteSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun) return { id: "", nombre: input.nombre, icono: input.icono ?? null, gravedadDefecto: input.gravedadDefecto, activo: input.activo, orden: input.orden };
    const fila = await sinDuplicado(
      ctx.db.tipoIncidente.create({
        data: {
          tenantId: ctx.tenantId,
          nombre: input.nombre,
          icono: input.icono ?? null,
          gravedadDefecto: input.gravedadDefecto,
          orden: input.orden,
          activo: input.activo,
        },
      }),
      "Ya existe un tipo de incidente activo con ese nombre.",
    );
    return vista(fila);
  },
});

/** Edita o desactiva un tipo de incidente del tenant. */
export const incidentesTipoActualizar = defineCapability({
  id: "rondas.incidentes_tipo.actualizar",
  descripcion:
    "Edita un tipo de incidente del tenant: nombre, ícono, gravedad por defecto, orden o si está activo. Desactivarlo lo quita de la hoja de novedad sin borrar los que ya lo usan.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(2).max(60).optional(),
    icono: z.string().trim().max(40).nullable().optional(),
    gravedadDefecto: gravedadSchema.optional(),
    orden: z.number().int().min(0).max(99).optional(),
    activo: z.boolean().optional(),
  }),
  output: tipoIncidenteSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const tipo = await tipoIncidenteDe(ctx, id);
    const data = definidos(cambios);
    const fila = dryRun
      ? { ...tipo, ...data }
      : await sinDuplicado(
          ctx.db.tipoIncidente.update({ where: { id }, data }),
          "Ya existe un tipo de incidente activo con ese nombre.",
        );
    return vista(fila);
  },
});
