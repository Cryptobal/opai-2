import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { PERMISO_COSTOS, PERMISO_READ } from "./permisos";
import { cotizacionDe } from "./util";
import { cargarFilasVersion, proyectarCalculo } from "../persistencia/recalcular";
import { calculoVigente } from "../persistencia/calculo-vigente";
import { metaFicha } from "../persistencia/ficha-meta";
import { mesesContrato, versionParaFicha } from "../persistencia/version";
import { INSTRUMENTOS_DEFECTO } from "../domain/motor/plantilla";
import { margenesTenant } from "../persistencia/supuestos";
import { leerInstrumentos } from "../persistencia/instrumentos-version";
import { metaSchema, parametrosSchema } from "./ficha-esquemas";
import { motorOutputSchema } from "./motor-esquemas";
import { lineaDeFicha } from "./ficha-lineas";
import type { CostoLineaFicha } from "../persistencia/costo-puesto-ficha";
import { uuidSchema } from "./esquemas";

export const cotizacionesFicha = defineCapability({
  auditarLectura: (s) => [s.cotizacion.id],
  id: "cpq.cotizaciones.ficha",
  descripcion:
    "Ensambla la ficha de cotización con secciones, líneas, cálculo en servidor y metadatos de aprobación.",
  permiso: PERMISO_READ,
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
    meta: metaSchema,
    /** Parámetros financieros de la versión; solo con `cpq:costos.ver` (R59). */
    parametros: parametrosSchema.optional(),
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
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cotizacionDe(ctx, input.id);
    const versionPre = await versionParaFicha(ctx, input.id, input.version);
    if (!versionPre) throw noEncontrado("La versión");
    const pack = await cargarFilasVersion(ctx, input.id, input.version, false);
    if (!pack) throw noEncontrado("La versión");
    const { version, secciones, lineas } = pack;
    const neg = await ctx.db.negocio.findFirst({
      where: { id: c.negocioId },
      select: { titulo: true, cuentaId: true },
    });
    const r = await calculoVigente(ctx, input.id, version, lineas);
    if (!r) throw noEncontrado("La versión");
    const meta = await metaFicha(ctx, c.id, c.creadoPorId, version, lineas, r);
    const verCostos = ctx.autorizar(PERMISO_COSTOS);
    const margenes = verCostos ? await margenesTenant(ctx) : null;
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
        editable: meta.editable,
      },
      meta,
      ...(verCostos
        ? {
            parametros: {
              mesesContrato: version.mesesContrato ?? mesesContrato(version.validaHasta),
              mesesPactados: version.mesesContrato !== null,
              margenModo: version.margenModo,
              margenObjetivoPct: version.margenObjetivoPct ?? margenes?.objetivoPct ?? null,
              margenMinimoPct: margenes?.minimoPct ?? 0,
              margenAlertaPct: margenes?.alertaPct ?? 0,
              sobrescrito: version.instrumentosJson !== null,
              instrumentos: leerInstrumentos(version.instrumentosJson) ?? INSTRUMENTOS_DEFECTO,
            },
          }
        : {}),
      secciones: secciones.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        instalacionId: s.instalacionId,
        lineas: lineas
          .filter((l) => l.seccionId === s.id)
          .map((l) => lineaDeFicha(l, verCostos, meta.costosLinea?.[l.id] as CostoLineaFicha | undefined)),
      })),
      calculo: proyectarCalculo(ctx, r),
    };
  },
});
