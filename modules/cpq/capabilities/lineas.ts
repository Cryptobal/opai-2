import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { aplicarCostosPredefinidos } from "../persistencia/costos-predefinidos";
import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { recalcularVersion } from "../persistencia/recalcular";
import { cotizacionDe } from "./util";
import { PERMISO_MANAGE } from "./permisos";
import { seccionDe, rechazarCostosSinPermiso } from "./lineas-util";
import { camposPuesto, CAMPOS_COSTO_PUESTO } from "./lineas-esquemas";
import { resolverSueldoPuesto } from "./lineas-puesto";
import { uuidSchema } from "./esquemas";
import { ID_VISTA_PREVIA } from "./util";

const salida = z.object({ id: uuidSchema, ventaMensualClp: z.number().int().nullable() });

export const lineasCrear = defineCapability({
  id: "cpq.lineas.crear",
  descripcion:
    "Agrega una línea de puesto o ítem a una sección en borrador; con cargo trae su sueldo de referencia y recalcula la venta.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    seccionId: uuidSchema,
    tipo: z.enum(["puesto", "item", "adicional"]),
    nombre: z.string().trim().min(1).max(120),
    grupo: z.string().trim().max(60).optional(),
    posiciones: z.number().int().min(1).max(10_000).default(1),
    ...camposPuesto,
    itemCodigo: z.string().max(40).optional(),
    cantidadEscalada: z.number().int().min(1).optional(),
    precioUnitarioClp: z.number().int().min(0).optional(),
    recurrencia: z.enum(["mensual", "unico"]).default("mensual"),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    rechazarCostosSinPermiso(ctx, input, CAMPOS_COSTO_PUESTO);
    const sec = await seccionDe(ctx, input.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const cot = await cotizacionDe(ctx, version.cotizacionId);
    const { seccionId: _s, ...resto } = input;
    const puesto = input.tipo === "puesto";
    const derivados = puesto ? await resolverSueldoPuesto(ctx, resto, null) : {};
    const sueldo = sinIndefinidos({ ...resto, ...derivados });
    const existentes = await ctx.db.cpqLinea.findMany({ where: { seccionId: sec.id }, select: { orden: true } });
    const data = {
      tenantId: ctx.tenantId,
      seccionId: sec.id,
      ...sueldo,
      habilitada: true,
      patron: input.patron ?? (puesto ? "4x4" : null),
      horaInicio: input.horaInicio ?? (puesto ? "08:00" : null),
      horaFin: input.horaFin ?? (puesto ? "20:00" : null),
      diasCobertura: derivados.diasCobertura ?? input.diasCobertura ?? (puesto ? 7 : null),
      itemCodigo: input.itemCodigo ?? (puesto ? null : "equipo"),
      cantidadEscalada: input.cantidadEscalada ?? 10_000,
      orden: existentes.reduce((m, l) => Math.max(m, l.orden), -1) + 1,
    };
    if (dryRun) {
      const r = await recalcularVersion(ctx, cot.id, undefined, false, {
        lineas: (ls) => [...ls, { ...ls[0], ...nuevaVacia(), ...data, id: ID_VISTA_PREVIA } as (typeof ls)[number]],
      });
      return { id: ID_VISTA_PREVIA, ventaMensualClp: r?.ventaMensual ?? null };
    }
    const linea = await ctx.db.cpqLinea.create({ data });
    if (puesto) await aplicarCostosPredefinidos(ctx, version.id, { lineaIds: [linea.id] });
    await recalcularVersion(ctx, cot.id, undefined, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { id: linea.id, ventaMensualClp: v.ventaMensualClp };
  },
});

/** Quita las claves `undefined` (exactOptionalPropertyTypes de Prisma): solo se escribe lo pedido. */
export function sinIndefinidos<T extends object>(o: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  const r: Partial<Record<keyof T, unknown>> = {};
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] !== undefined) r[k] = o[k];
  return r as { [K in keyof T]: Exclude<T[K], undefined> };
}

/** Columnas nulas de una línea nueva para la vista previa en memoria. */
export function nuevaVacia() {
  return {
    grupo: null, recurrencia: "mensual", visibleCliente: true, personasPorPosicionEscaladas: null, personasMotivo: null,
    sueldoBaseClp: null, rateoJson: null, precioUnitarioClp: null, margenPropioPct: null, alcanceDotacion: null,
    huellaJuegoValores: null, cargoId: null, diasSemana: [], sueldoOrigen: null, sueldoModo: "bruto",
    liquidoObjetivoClp: null, colacionClp: null, movilizacionClp: null, afp: null, saludTipo: null,
    saludPlanUf: null, tipoContrato: null,
  };
}

export const lineasActualizar = defineCapability({
  id: "cpq.lineas.actualizar",
  descripcion:
    "Edita una línea en borrador: cargo, patrón, días, horario, sueldo bruto o líquido, colación, movilización y supuestos.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(1).max(120).optional(),
    grupo: z.string().trim().max(60).nullable().optional(),
    habilitada: z.boolean().optional(),
    posiciones: z.number().int().min(1).max(10_000).optional(),
    ...camposPuesto,
    personasPorPosicionEscaladas: z.number().int().min(10_000).max(1_000_000_000).nullable().optional(),
    personasMotivo: z.string().trim().min(1).max(500).nullable().optional(),
    cantidadEscalada: z.number().int().min(1).optional(),
    precioUnitarioClp: z.number().int().min(0).optional(),
    margenPropioPct: z.number().int().min(0).max(999_999).optional(),
    recurrencia: z.enum(["mensual", "unico"]).optional(),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    rechazarCostosSinPermiso(ctx, input, CAMPOS_COSTO_PUESTO);
    const actual = await ctx.db.cpqLinea.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("La línea");
    const sec = await seccionDe(ctx, actual.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const cot = await cotizacionDe(ctx, version.cotizacionId);
    const { id, ...cambios } = input;
    const derivados = actual.tipo === "puesto" ? await resolverSueldoPuesto(ctx, cambios, actual) : {};
    const data = sinIndefinidos({ ...cambios, ...derivados });
    if (dryRun) {
      const r = await recalcularVersion(ctx, cot.id, undefined, false, {
        lineas: (ls) => ls.map((l) => (l.id === id ? ({ ...l, ...data } as typeof l) : l)),
      });
      return { id, ventaMensualClp: r?.ventaMensual ?? null };
    }
    await ctx.db.cpqLinea.update({ where: { id }, data });
    await recalcularVersion(ctx, cot.id, undefined, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { id, ventaMensualClp: v.ventaMensualClp };
  },
});
