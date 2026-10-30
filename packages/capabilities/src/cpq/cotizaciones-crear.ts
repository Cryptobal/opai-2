import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { diaSchema } from "../core/maestros/comun";
import { uuidSchema } from "../core/esquemas";
import {
  DEFECTOS,
  PERMISO_MANAGE,
  hoyEn,
  monedaSchema,
  modoMargenSchema,
  pctSchema,
  revalidarCostos,
  sumarDias,
  tituloSchema,
  veCostos,
  zonaDelTenant,
} from "./comun";
import { siguienteCodigo } from "./correlativo";
import { exigirCostos, instalacionesCotizables, negocioAbierto } from "./validaciones";
import { resumenSchema, versionSchema, vistaResumen, vistaVersion } from "./vistas";
import { seccionSchema, vistaSeccion } from "./vistas-detalle";

/** Crea una cotización CPQ-AAAA-NNN en borrador (v1) desde un negocio abierto (R18, R54, §6). */
export const cotizacionesCreate = defineCapability({
  id: "cpq.cotizaciones.create",
  descripcion:
    "Crea una cotización en borrador desde un negocio abierto, con su código correlativo CPQ-AAAA-NNN, la versión 1, una sección por instalación del negocio y, si se pide, la sección Común.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    titulo: tituloSchema.optional().describe("Por defecto, el título del negocio."),
    instalacionIds: z
      .array(uuidSchema)
      .max(50)
      .optional()
      .describe("Instalaciones del negocio a cotizar; por defecto todas las que ves (R19)."),
    comun: z.boolean().default(false).describe("Agrega la sección Común (R18, R22)."),
    alternativaDeId: uuidSchema.optional().describe("Otra cotización del mismo negocio (R23)."),
    moneda: monedaSchema.optional().describe("Moneda de presentación; por defecto UF (R62)."),
    validaHasta: diaSchema.optional().describe("≥ hoy; por defecto hoy + 30 días."),
    modoMargen: modoMargenSchema.optional(),
    margenObjetivo: pctSchema.optional().describe("Escalado por PCT_ESCALA; exige ver costos."),
  }),
  output: resumenSchema.extend({
    versionDetalle: versionSchema,
    secciones: z.array(seccionSchema),
  }),
  efecto: "escritura",
  dryRun: true,
  autorizarRepeticion: revalidarCostos,
  async handler(ctx, input, { dryRun }) {
    exigirCostos(ctx, [
      ...(input.margenObjetivo !== undefined ? ["el margen"] : []),
      ...(input.modoMargen !== undefined ? ["el modo de margen"] : []),
    ]);
    const negocio = await negocioAbierto(ctx, input.negocioId);
    if (input.alternativaDeId) {
      const alt = await ctx.db.cotizacion.findUnique({ where: { id: input.alternativaDeId } });
      if (!alt) throw noEncontrado("La cotización");
      if (alt.negocioId !== negocio.id) throw reglaDeNegocio("La alternativa es de otro negocio.");
    }
    const instalaciones = await instalacionesCotizables(ctx, negocio.id, input.instalacionIds);
    if (!instalaciones.length && !input.comun)
      throw reglaDeNegocio("La cotización necesita al menos una instalación o la sección Común.");
    const hoy = hoyEn(await zonaDelTenant(ctx));
    const validaHasta = input.validaHasta
      ? new Date(`${input.validaHasta}T00:00:00Z`)
      : sumarDias(hoy.dia, DEFECTOS.validezDias);
    if (validaHasta.toISOString().slice(0, 10) < hoy.dia)
      throw reglaDeNegocio("«Válida hasta» no puede ser anterior a hoy.");
    const secciones = [
      ...instalaciones.map((i, orden) => ({
        tipo: "instalacion",
        instalacionId: i.id,
        nombre: i.nombre,
        orden,
      })),
      ...(input.comun
        ? [{ tipo: "comun", instalacionId: null, nombre: "Común", orden: instalaciones.length }]
        : []),
    ];
    const version = {
      numero: 1,
      estado: "borrador",
      moneda: input.moneda ?? DEFECTOS.moneda,
      validaHasta,
      modoMargen: input.modoMargen ?? DEFECTOS.modoMargen,
      margenObjetivo: input.margenObjetivo ?? DEFECTOS.margenObjetivo,
      // Explícitos: la base en memoria de los tests no aplica los defaults de Prisma.
      precioManual: null,
      ventaMensual: null,
      pagosUnicos: null,
      costoMensual: null,
      margenEfectivo: null,
      ufValor: null,
      ufFecha: null,
      revision: 0,
      enviadaEn: null,
    };
    const creada = await ctx.transaccion(async (tx) => {
      // Correlativo y «vigente» bajo el mismo advisory lock por tenant y año (R54, sin TOCTOU).
      const codigo = await siguienteCodigo(tx, ctx.tenantId, hoy.anio);
      const yaVigente = await tx.cotizacion.count({
        where: { negocioId: negocio.id, vigente: true },
      });
      const cot = {
        negocioId: negocio.id,
        ...codigo,
        titulo: input.titulo ?? negocio.titulo,
        estado: "borrador",
        vigente: yaVigente === 0,
        alternativaDeId: input.alternativaDeId ?? null,
        creadaPor: ctx.usuario?.id ?? null,
      };
      if (dryRun) return { c: { id: "", createdAt: new Date(), ...cot }, v: null, s: [] };
      const c = await tx.cotizacion.create({ data: { ...cot, tenantId: ctx.tenantId } });
      const v = await tx.versionCotizacion.create({
        data: { ...version, tenantId: ctx.tenantId, cotizacionId: c.id },
      });
      const s = [];
      for (const sec of secciones)
        s.push(
          await tx.seccionCotizacion.create({
            data: { ...sec, tenantId: ctx.tenantId, versionId: v.id },
          }),
        );
      await ctx.eventos.emitir(tx, {
        tipo: "cpq.cotizacion.creada",
        entidadTipo: "cotizacion",
        entidadId: c.id,
        payload: { codigo: c.codigo, negocioId: c.negocioId, versionId: v.id },
      });
      return { c, v, s };
    });
    const v = creada.v ?? { id: "", ...version };
    const costos = veCostos(ctx);
    return {
      ...vistaResumen(creada.c, v, costos),
      versionDetalle: vistaVersion(v, costos),
      secciones: (creada.v ? creada.s : secciones.map((x) => ({ id: "", ...x }))).map(vistaSeccion),
    };
  },
});
