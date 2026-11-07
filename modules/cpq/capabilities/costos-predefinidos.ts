import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { aplicarCostosPredefinidos } from "../persistencia/costos-predefinidos";
import { recalcularVersion } from "../persistencia/recalcular";
import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { categoriasAjustables } from "./costos-categoria";
import { uuidSchema } from "./esquemas";
import { PERMISO_COSTOS, PERMISO_MANAGE, PERMISO_MODELO } from "./permisos";

const filaSchema = z.object({
  categoria: z.string().min(1).max(60).describe("Categoría del modelo de costeo (uniformes, examenes…); «feriados» se calcula."),
  montoClp: z.number().int().min(0).max(2_000_000_000).describe("Costo mensual en CLP entero."),
  alcance: z.enum(["global", "por_puesto"]).describe("«global»: una vez por cotización; «por_puesto»: en cada puesto."),
  activo: z.boolean().default(true),
});

export const costosPredefinidosList = defineCapability({
  auditarLectura: (s) => s.items.map((i) => `${i.alcance}:${i.categoria}`),
  id: "cpq.costos_predefinidos.list",
  descripcion:
    "Lista los costos predefinidos de la empresa (p. ej. el uniforme) que se cargan solos en cada cotización, con su monto, si valen una vez o por puesto, y las categorías que admiten costo.",
  permiso: PERMISO_COSTOS,
  input: z.object({}),
  output: z.object({
    items: z.array(filaSchema),
    categorias: z.array(z.object({ id: z.string(), nombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await ctx.db.cpqCostoPredefinido.findMany({ orderBy: [{ orden: "asc" }, { categoria: "asc" }] });
    return {
      items: filas.map((f) => ({ categoria: f.categoria, montoClp: f.montoClp, alcance: f.alcance as "global" | "por_puesto", activo: f.activo })),
      categorias: await categoriasAjustables(ctx),
    };
  },
});

export const costosPredefinidosGuardar = defineCapability({
  id: "cpq.costos_predefinidos.guardar",
  descripcion:
    "Reemplaza la lista de costos predefinidos de la empresa: cada uno es una categoría con su monto mensual, una vez por cotización o por cada puesto; se cargan solos al crear la cotización y al agregar puestos, y no pisan lo ya editado.",
  permiso: PERMISO_MODELO,
  input: z.object({ items: z.array(filaSchema).max(50) }),
  output: z.object({ guardados: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const validas = new Set((await categoriasAjustables(ctx)).map((c) => c.id));
    const vistos = new Set<string>();
    for (const i of input.items) {
      if (!validas.has(i.categoria)) throw reglaDeNegocio(`La categoría «${i.categoria}» no admite costo predefinido.`);
      const k = `${i.alcance}:${i.categoria}`;
      if (vistos.has(k)) throw reglaDeNegocio("Hay dos costos predefinidos de la misma categoría y alcance.");
      vistos.add(k);
    }
    if (dryRun) return { guardados: input.items.length };
    await ctx.db.cpqCostoPredefinido.deleteMany({});
    if (input.items.length)
      await ctx.db.cpqCostoPredefinido.createMany({
        data: input.items.map((i, orden) => ({ tenantId: ctx.tenantId, categoria: i.categoria, montoClp: i.montoClp, alcance: i.alcance, activo: i.activo, orden })),
      });
    return { guardados: input.items.length };
  },
});

export const costosCategoriaCargarPredefinidos = defineCapability({
  id: "cpq.costos_categoria.cargar_predefinidos",
  descripcion:
    "Carga de un clic en una cotización en borrador los costos predefinidos de la empresa que aún no tiene (una vez, o en cada puesto), sin pisar los ya editados, y recalcula venta y margen.",
  permiso: PERMISO_MANAGE,
  input: z.object({ versionId: uuidSchema }),
  output: z.object({ cargados: z.number().int(), ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const version = await versionDeCotizacion(ctx, input.versionId);
    exigirBorrador(version);
    if (dryRun) {
      const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, false);
      return { cargados: 0, ventaMensualClp: r?.ventaMensual ?? null };
    }
    const cargados = await aplicarCostosPredefinidos(ctx, version.id);
    const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, true);
    return { cargados, ventaMensualClp: r?.ventaMensual ?? null };
  },
});
