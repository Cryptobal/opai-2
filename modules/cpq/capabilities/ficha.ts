import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { PERMISO_COSTOS, PERMISO_READ } from "./permisos";
import { cotizacionDe } from "./util";
import { cargarFilasVersion, proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { calculoCongelado } from "../persistencia/calculo-congelado";
import { metaFicha } from "../persistencia/ficha-meta";
import { versionParaFicha } from "../persistencia/version";
import { motorOutputSchema } from "./motor-esquemas";
import { uuidSchema } from "./esquemas";

const metaSchema = z.object({
  fechaCalculo: z.string(),
  validaHastaContrato: z.string().nullable(),
  editable: z.boolean(),
  avisoRecalculo: z
    .object({ mensaje: z.string(), huellaActual: z.string().nullable() })
    .nullable(),
  aprobacion: z
    .object({
      id: uuidSchema,
      bandejaId: z.string(),
      estado: z.string(),
      solicitadaPorId: uuidSchema,
    })
    .nullable(),
  puedeEnviar: z.boolean(),
  puedeAprobarMargen: z.boolean(),
  motivoNoAprobarMargen: z.string().nullable(),
  autoaprobacionMargen: z.boolean().nullable(),
  requiereConfirmacionValoresViejos: z.boolean(),
  costosLinea: z.record(z.string(), z.unknown()).optional(),
});

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
    const r =
      version.estado === "borrador" || version.estado === "en_aprobacion" || version.estado === "lista"
        ? await recalcularVersion(ctx, input.id, input.version, false)
        : calculoCongelado(ctx, version, lineas);
    if (!r) throw noEncontrado("La versión");
    const meta = await metaFicha(ctx, c.id, c.creadoPorId, version, lineas, r);
    const verCostos = ctx.autorizar(PERMISO_COSTOS);
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
            recurrencia: l.recurrencia,
            habilitada: l.habilitada,
            patron: l.patron,
            horaInicio: l.horaInicio,
            horaFin: l.horaFin,
            diasCobertura: l.diasCobertura,
            sueldoBaseClp: verCostos ? l.sueldoBaseClp : undefined,
            itemCodigo: l.itemCodigo,
            cantidadEscalada: l.cantidadEscalada,
            precioUnitarioClp: verCostos ? l.precioUnitarioClp : undefined,
            huellaJuegoValores: verCostos ? l.huellaJuegoValores : undefined,
            costo: verCostos ? meta.costosLinea?.[l.id] : undefined,
          })),
      })),
      calculo: proyectarCalculo(ctx, r),
    };
  },
});
