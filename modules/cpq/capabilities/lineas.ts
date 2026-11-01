import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { recalcularVersion } from "../persistencia/recalcular";
import { cotizacionDe } from "./util";
import { PERMISO_MANAGE } from "./permisos";
import { seccionDe, vistaPrevia } from "./lineas-util";
import { uuidSchema } from "./esquemas";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const lineasCrear = defineCapability({
  id: "cpq.lineas.crear",
  descripcion: "Agrega una línea de puesto o ítem a una sección en borrador; recalcula venta en servidor.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    seccionId: uuidSchema,
    tipo: z.enum(["puesto", "item", "adicional"]),
    nombre: z.string().trim().min(1).max(120),
    posiciones: z.number().int().min(1).max(10_000).default(1),
    patron: z.string().max(20).optional(),
    horaInicio: hora.optional(),
    horaFin: hora.optional(),
    diasCobertura: z.number().int().min(1).max(7).optional(),
    sueldoBaseClp: z.number().int().min(0).optional(),
    itemCodigo: z.string().max(40).optional(),
    cantidadEscalada: z.number().int().min(1).optional(),
    precioUnitarioClp: z.number().int().min(0).optional(),
  }),
  output: z.object({ id: uuidSchema, ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const sec = await seccionDe(ctx, input.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const cot = await cotizacionDe(ctx, version.cotizacionId);
    if (dryRun) return { id: "00000000-0000-0000-0000-000000000000", ...(await vistaPrevia(ctx, cot.id)) };
    const existentes = await ctx.db.cpqLinea.findMany({ where: { seccionId: sec.id }, select: { orden: true } });
    const orden = existentes.reduce((m, l) => Math.max(m, l.orden), -1) + 1;
    const linea = await ctx.db.cpqLinea.create({
      data: {
        tenantId: ctx.tenantId,
        seccionId: sec.id,
        tipo: input.tipo,
        nombre: input.nombre,
        posiciones: input.posiciones,
        patron: input.patron ?? (input.tipo === "puesto" ? "4x4" : null),
        horaInicio: input.horaInicio ?? (input.tipo === "puesto" ? "08:00" : null),
        horaFin: input.horaFin ?? (input.tipo === "puesto" ? "20:00" : null),
        diasCobertura: input.diasCobertura ?? (input.tipo === "puesto" ? 7 : null),
        sueldoBaseClp: input.sueldoBaseClp ?? null,
        itemCodigo: input.itemCodigo ?? (input.tipo === "puesto" ? null : "equipo"),
        cantidadEscalada: input.cantidadEscalada ?? 10_000,
        precioUnitarioClp: input.precioUnitarioClp ?? null,
        orden,
      },
    });
    await recalcularVersion(ctx, cot.id, undefined, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { id: linea.id, ventaMensualClp: v.ventaMensualClp };
  },
});

export const lineasActualizar = defineCapability({
  id: "cpq.lineas.actualizar",
  descripcion: "Edita una línea de cotización en borrador (puesto, ítem o adicional).",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(1).max(120).optional(),
    habilitada: z.boolean().optional(),
    posiciones: z.number().int().min(1).max(10_000).optional(),
    patron: z.string().max(20).optional(),
    horaInicio: hora.optional(),
    horaFin: hora.optional(),
    diasCobertura: z.number().int().min(1).max(7).optional(),
    personasPorPosicionEscaladas: z.number().int().min(10_000).max(1_000_000_000).optional(),
    personasMotivo: z.string().trim().min(1).max(500).optional(),
    sueldoBaseClp: z.number().int().min(0).optional(),
    cantidadEscalada: z.number().int().min(1).optional(),
    precioUnitarioClp: z.number().int().min(0).optional(),
    margenPropioPct: z.number().int().min(0).max(999_999).optional(),
  }),
  output: z.object({ id: uuidSchema, ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.cpqLinea.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("La línea");
    const sec = await seccionDe(ctx, actual.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const cot = await cotizacionDe(ctx, version.cotizacionId);
    const { id, ...cambios } = input;
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    if (dryRun) return { id, ...(await vistaPrevia(ctx, cot.id)) };
    await ctx.db.cpqLinea.update({ where: { id }, data });
    await recalcularVersion(ctx, cot.id, undefined, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { id, ventaMensualClp: v.ventaMensualClp };
  },
});

export const lineasQuitar = defineCapability({
  id: "cpq.lineas.quitar",
  descripcion: "Quita una línea de la cotización en borrador.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: z.object({ ok: z.literal(true), ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.cpqLinea.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("La línea");
    const sec = await seccionDe(ctx, actual.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const cot = await cotizacionDe(ctx, version.cotizacionId);
    if (dryRun) return { ok: true as const, ...(await vistaPrevia(ctx, cot.id)) };
    await ctx.db.cpqLinea.delete({ where: { id: input.id } });
    await recalcularVersion(ctx, cot.id, undefined, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { ok: true as const, ventaMensualClp: v.ventaMensualClp };
  },
});

export const lineasReordenar = defineCapability({
  id: "cpq.lineas.reordenar",
  descripcion: "Reordena las líneas dentro de una sección.",
  permiso: PERMISO_MANAGE,
  input: z.object({ seccionId: uuidSchema, ids: z.array(uuidSchema).min(1).max(200) }),
  output: z.object({ ok: z.literal(true) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const sec = await seccionDe(ctx, input.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const lineas = await ctx.db.cpqLinea.findMany({ where: { seccionId: sec.id } });
    if (input.ids.length !== lineas.length) throw reglaDeNegocio("Faltan líneas en el reorden.");
    if (dryRun) return { ok: true as const };
    await ctx.transaccion(async (tx) => {
      for (let i = 0; i < input.ids.length; i++)
        await tx.cpqLinea.update({ where: { id: input.ids[i]! }, data: { orden: i } });
    });
    return { ok: true as const };
  },
});
