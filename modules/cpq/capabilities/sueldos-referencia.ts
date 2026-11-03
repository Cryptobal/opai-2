import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { fechaCalculoHoy } from "../persistencia/fecha-calculo";
import { sueldosReferenciaVigentes } from "../persistencia/sueldos-referencia";
import { uuidSchema } from "./esquemas";
import { PERMISO_COSTOS, PERMISO_MODELO, PERMISO_READ } from "./permisos";
import { ID_VISTA_PREVIA } from "./util";

const filaSchema = z.object({
  cargoId: uuidSchema,
  cargo: z.string(),
  /** Solo con `cpq:costos.ver`; sin él la clave no viaja (R59). */
  sueldoBaseClp: z.number().int().nullable().optional(),
  vigenteDesde: z.string().nullable(),
  cotizacionesAbiertas: z.number().int(),
});

export const sueldosReferenciaList = defineCapability({
  id: "cpq.sueldos_referencia.list",
  descripcion:
    "Lista los cargos con su sueldo de referencia para cotizar vigente y cuántas cotizaciones abiertas lo usan; supuesto de venta, no el sueldo que se paga.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({ items: z.array(filaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const cargos = await ctx.db.cargo.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true },
    });
    const vigentes = await sueldosReferenciaVigentes(ctx, fechaCalculoHoy(), cargos.map((c) => c.id));
    const abiertas = await ctx.db.cpqLinea.groupBy({
      by: ["cargoId"],
      where: { cargoId: { in: cargos.map((c) => c.id) }, sueldoOrigen: "referencia_cargo", seccion: { version: { estado: "borrador" } } },
      _count: { _all: true },
    });
    const usos = new Map(abiertas.map((a) => [a.cargoId, a._count._all]));
    const verCostos = ctx.autorizar(PERMISO_COSTOS);
    return {
      items: cargos.map((c) => {
        const v = vigentes.get(c.id);
        return {
          cargoId: c.id,
          cargo: c.nombre,
          ...(verCostos ? { sueldoBaseClp: v?.sueldoBaseClp ?? null } : {}),
          vigenteDesde: v?.vigenteDesde ?? null,
          cotizacionesAbiertas: usos.get(c.id) ?? 0,
        };
      }),
    };
  },
});

export const sueldosReferenciaFijar = defineCapability({
  id: "cpq.sueldos_referencia.fijar",
  descripcion:
    "Fija el sueldo de referencia para cotizar de un cargo desde una fecha; crea una versión nueva sin tocar cotizaciones enviadas.",
  permiso: PERMISO_MODELO,
  input: z.object({
    cargoId: uuidSchema,
    sueldoBaseClp: z.number().int().min(0).max(100_000_000),
    vigenteDesde: z.iso.date().optional().describe("Por defecto, hoy."),
  }),
  output: z.object({ id: uuidSchema, vigenteDesde: z.string(), cotizacionesAbiertas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.autorizar(PERMISO_COSTOS)) throw noEncontrado("Sueldo de referencia");
    const cargo = await ctx.db.cargo.findFirst({ where: { id: input.cargoId }, select: { id: true } });
    if (!cargo) throw noEncontrado("El cargo");
    const desde = input.vigenteDesde ?? fechaCalculoHoy();
    const cotizacionesAbiertas = await ctx.db.cpqLinea.count({
      where: { cargoId: input.cargoId, sueldoOrigen: "referencia_cargo", seccion: { version: { estado: "borrador" } } },
    });
    if (dryRun) return { id: ID_VISTA_PREVIA, vigenteDesde: desde, cotizacionesAbiertas };
    const fecha = new Date(`${desde}T00:00:00Z`);
    const fila = await ctx.db.cpqSueldoReferencia.upsert({
      where: { tenantId_cargoId_vigenteDesde: { tenantId: ctx.tenantId, cargoId: input.cargoId, vigenteDesde: fecha } },
      create: { tenantId: ctx.tenantId, cargoId: input.cargoId, sueldoBaseClp: input.sueldoBaseClp, vigenteDesde: fecha, creadoPorId: ctx.usuario!.id },
      update: { sueldoBaseClp: input.sueldoBaseClp },
    });
    return { id: fila.id, vigenteDesde: desde, cotizacionesAbiertas };
  },
});
