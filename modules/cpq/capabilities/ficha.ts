import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { motorOutputSchema } from "./motor-esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";
import { cargarFilasVersion, proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { calculoCongelado } from "../persistencia/calculo-congelado";
import { uuidSchema } from "./esquemas";

export const cotizacionesCalcular = defineCapability({
  id: "cpq.cotizaciones.calcular",
  descripcion:
    "Recalcula en servidor la versión editable (o la indicada) de una cotización con el motor CPQ y costo empleador legal; persiste venta y huellas solo en borrador y con dry_run desactivado.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, version: z.number().int().min(1).optional() }),
  output: motorOutputSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    const r = await recalcularVersion(ctx, input.id, input.version, !dryRun);
    if (!r) throw noEncontrado("La versión");
    return proyectarCalculo(ctx, r);
  },
});

export const cotizacionesFicha = defineCapability({
  id: "cpq.cotizaciones.ficha",
  descripcion:
    "Ensambla la ficha de cotización con secciones, líneas y cálculo en servidor; sincroniza secciones y persiste venta solo en borrador y sin dry_run.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, version: z.number().int().min(1).optional() }),
  output: z.object({
    cotizacion: z.object({
      id: uuidSchema,
      codigo: z.string(),
      titulo: z.string(),
      negocioId: uuidSchema,
      vigente: z.boolean(),
    }),
    negocioTitulo: z.string().nullable(),
    cuentaId: uuidSchema.nullable(),
    version: z.object({
      id: uuidSchema,
      numero: z.number().int(),
      estado: z.string(),
      validaHasta: z.string().nullable(),
      editable: z.boolean(),
    }),
    secciones: z.array(
      z.object({
        id: uuidSchema,
        nombre: z.string(),
        instalacionId: uuidSchema.nullable(),
        lineas: z.array(z.record(z.string(), z.unknown())),
      }),
    ),
    calculo: motorOutputSchema,
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cotizacionDe(ctx, input.id);
    const escribir = !dryRun;
    const pack = await cargarFilasVersion(ctx, input.id, input.version, escribir);
    if (!pack) throw noEncontrado("La versión");
    const { version, secciones, lineas } = pack;
    const neg = await ctx.db.negocio.findFirst({
      where: { id: c.negocioId },
      select: { titulo: true, cuentaId: true },
    });
    const r =
      version.estado === "borrador"
        ? await recalcularVersion(ctx, input.id, input.version, escribir)
        : calculoCongelado(version, lineas);
    if (!r) throw noEncontrado("La versión");
    return {
      cotizacion: {
        id: c.id,
        codigo: c.codigo,
        titulo: c.titulo,
        negocioId: c.negocioId,
        vigente: c.vigente,
      },
      negocioTitulo: neg?.titulo ?? null,
      cuentaId: neg?.cuentaId ?? null,
      version: {
        id: version.id,
        numero: version.numero,
        estado: version.estado,
        validaHasta: version.validaHasta?.toISOString().slice(0, 10) ?? null,
        editable: version.estado === "borrador",
      },
      secciones: secciones.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        instalacionId: s.instalacionId,
        lineas: lineas
          .filter((l) => l.seccionId === s.id)
          .map((l) => ({
            id: l.id,
            tipo: l.tipo,
            nombre: l.nombre,
            posiciones: l.posiciones,
            habilitada: l.habilitada,
            patron: l.patron,
            horaInicio: l.horaInicio,
            horaFin: l.horaFin,
            diasCobertura: l.diasCobertura,
            sueldoBaseClp: ctx.autorizar("cpq:costos.ver") ? l.sueldoBaseClp : undefined,
            itemCodigo: l.itemCodigo,
            cantidadEscalada: l.cantidadEscalada,
            precioUnitarioClp: ctx.autorizar("cpq:costos.ver") ? l.precioUnitarioClp : undefined,
          })),
      })),
      calculo: proyectarCalculo(ctx, r),
    };
  },
});
