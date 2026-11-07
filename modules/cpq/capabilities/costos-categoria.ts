import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { modeloDesdeCatalogo } from "../persistencia/catalogo-modelo";
import { recalcularVersion } from "../persistencia/recalcular";
import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { uuidSchema } from "./esquemas";
import { PERMISO_COSTOS, PERMISO_MANAGE } from "./permisos";

const costoSchema = z.object({
  /** Id de categoría del modelo de costeo (uniformes, examenes, vehiculos…); «feriados» se calcula. */
  categoria: z.string().min(1).max(60),
  /** Costo mensual en CLP entero. */
  montoClp: z.number().int().min(0).max(2_000_000_000),
  /** Puesto al que se asigna; nulo = global de la cotización. */
  lineaId: uuidSchema.nullable(),
});
const filaSchema = costoSchema.extend({ id: uuidSchema });

/** Categorías que admiten costo manual: todas las del modelo salvo feriados. */
export async function categoriasAjustables(ctx: Parameters<typeof modeloDesdeCatalogo>[0]) {
  const modelo = await modeloDesdeCatalogo(ctx, { persistirCatalogo: false });
  return modelo.categorias.filter((c) => c.id !== "feriados").map((c) => ({ id: c.id, nombre: c.nombre }));
}

export const costosCategoriaList = defineCapability({
  auditarLectura: (s) => s.items.map((i) => i.id),
  id: "cpq.costos_categoria.list",
  descripcion:
    "Lista los costos manuales por categoría de una versión (de un puesto o globales de la cotización) y las categorías que admiten costo.",
  permiso: PERMISO_COSTOS,
  input: z.object({ versionId: uuidSchema }),
  output: z.object({
    items: z.array(filaSchema),
    categorias: z.array(z.object({ id: z.string(), nombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const version = await versionDeCotizacion(ctx, input.versionId);
    const filas = await ctx.db.cpqCostoCategoria.findMany({
      where: { versionId: version.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return {
      items: filas.map((f) => ({ id: f.id, categoria: f.categoria, montoClp: f.montoClp, lineaId: f.lineaId })),
      categorias: await categoriasAjustables(ctx),
    };
  },
});

export const costosCategoriaGuardar = defineCapability({
  id: "cpq.costos_categoria.guardar",
  descripcion:
    "Reemplaza los costos manuales por categoría de una versión en borrador, cada uno asignado a un puesto o a toda la cotización, y recalcula totales y margen en el servidor.",
  permiso: PERMISO_MANAGE,
  input: z.object({ versionId: uuidSchema, items: z.array(costoSchema).max(200) }),
  output: z.object({
    ventaMensualClp: z.number().int().nullable(),
    costoMensualClp: z.number().int(),
    margenEfectivoPct: z.number().int(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.autorizar(PERMISO_COSTOS)) throw noEncontrado("Costos por categoría");
    const version = await versionDeCotizacion(ctx, input.versionId);
    exigirBorrador(version);
    const validas = new Set((await categoriasAjustables(ctx)).map((c) => c.id));
    const claves = new Set<string>();
    for (const i of input.items) {
      if (!validas.has(i.categoria)) throw reglaDeNegocio(`La categoría «${i.categoria}» no admite costo manual.`);
      const clave = `${i.lineaId ?? "global"}:${i.categoria}`;
      if (claves.has(clave)) throw reglaDeNegocio("Hay dos costos de la misma categoría para el mismo alcance.");
      claves.add(clave);
    }
    const secciones = await ctx.db.cpqSeccion.findMany({ where: { versionId: version.id }, select: { id: true } });
    const puestos = await ctx.db.cpqLinea.findMany({
      where: { seccionId: { in: secciones.map((s) => s.id) }, tipo: "puesto" },
      select: { id: true },
    });
    const idsPuesto = new Set(puestos.map((p) => p.id));
    if (input.items.some((i) => i.lineaId && !idsPuesto.has(i.lineaId)))
      throw reglaDeNegocio("El puesto indicado no pertenece a esta versión.");
    if (dryRun) {
      const ahora = new Date();
      const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, false, {
        costos: () =>
          input.items.map((i, n) => ({
            id: `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`,
            tenantId: version.tenantId,
            versionId: version.id,
            lineaId: i.lineaId,
            categoria: i.categoria,
            montoClp: i.montoClp,
            createdAt: ahora,
            updatedAt: ahora,
          })),
      });
      return { ventaMensualClp: r?.ventaMensual ?? null, costoMensualClp: r?.costoMensual ?? 0, margenEfectivoPct: r?.margenEfectivoPct ?? 0 };
    }
    await ctx.db.cpqCostoCategoria.deleteMany({ where: { versionId: version.id } });
    if (input.items.length)
      await ctx.db.cpqCostoCategoria.createMany({
        data: input.items.map((i) => ({
          tenantId: ctx.tenantId,
          versionId: version.id,
          lineaId: i.lineaId,
          categoria: i.categoria,
          montoClp: i.montoClp,
        })),
      });
    const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, true);
    return { ventaMensualClp: r?.ventaMensual ?? null, costoMensualClp: r?.costoMensual ?? 0, margenEfectivoPct: r?.margenEfectivoPct ?? 0 };
  },
});
