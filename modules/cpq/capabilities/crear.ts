import { z } from "zod";

import {
  conflicto,
  defineCapability,
  noEncontrado,
  prohibido,
  reglaDeNegocio,
} from "@opai/capabilities";

import { anioEnZona, formatearCodigo, validaHastaPorDefecto } from "../domain";
import { monedaSchema, uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { ID_VISTA_PREVIA } from "./util";

export const cotizacionesCreate = defineCapability({
  id: "cpq.cotizaciones.create",
  descripcion:
    "Crea una cotización en borrador (versión 1) colgada de un negocio abierto de Comercial, con su código correlativo CPQ-AAAA-NNN; la primera del negocio queda como vigente y las demás como alternativas si se indican.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    titulo: z.string().trim().min(3).max(160),
    moneda: monedaSchema.default("CLP"),
    validaHasta: z.iso.date().optional().describe("Por defecto, hoy más 30 días."),
    alternativaDeId: uuidSchema.optional().describe("Otra cotización del mismo negocio (R23)."),
  }),
  output: z.object({
    id: uuidSchema,
    codigo: z.string(),
    versionId: uuidSchema,
    vigente: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.usuario)
      throw prohibido("Se necesita una sesión de usuario para crear una cotización.");
    const negocio = await ctx.db.negocio.findFirst({ where: { id: input.negocioId } });
    if (!negocio) throw noEncontrado("El negocio");
    if (negocio.estado !== "abierto" || negocio.archivadoEn)
      throw reglaDeNegocio("Solo se cotiza un negocio abierto: reábrelo o crea uno nuevo.");
    if (input.alternativaDeId) {
      const base = await ctx.db.cpqCotizacion.findFirst({ where: { id: input.alternativaDeId } });
      if (!base || base.negocioId !== negocio.id)
        throw reglaDeNegocio("Una alternativa debe ser de una cotización del mismo negocio.");
    }
    const ahora = new Date();
    const hoy = validaHastaPorDefecto(ahora, 0);
    const validaHasta = input.validaHasta ?? validaHastaPorDefecto(ahora);
    if (validaHasta < hoy) throw reglaDeNegocio("«Válida hasta» no puede ser anterior a hoy.");
    const anio = anioEnZona(ahora);
    const vigenteActual = await ctx.db.cpqCotizacion.findFirst({
      where: { negocioId: negocio.id, vigente: true },
    });
    const vigente = !vigenteActual && !input.alternativaDeId;
    if (dryRun) {
      const c = await ctx.db.cpqCorrelativo.findFirst({ where: { anio } });
      return {
        id: ID_VISTA_PREVIA,
        codigo: formatearCodigo(anio, (c?.ultimo ?? 0) + 1),
        versionId: ID_VISTA_PREVIA,
        vigente,
      };
    }
    try {
      return await ctx.transaccion(async (tx) => {
        // Upsert atómico: la fila se bloquea hasta el fin de la transacción, así que dos creaciones
        // simultáneas no repiten número (R54) y un fallo posterior no deja un hueco.
        const corr = await tx.cpqCorrelativo.upsert({
          where: { tenantId_anio: { tenantId: ctx.tenantId, anio } },
          create: { tenantId: ctx.tenantId, anio, ultimo: 1 },
          update: { ultimo: { increment: 1 } },
        });
        const codigo = formatearCodigo(anio, corr.ultimo);
        const c = await tx.cpqCotizacion.create({
          data: {
            tenantId: ctx.tenantId,
            codigo,
            negocioId: negocio.id,
            titulo: input.titulo,
            alternativaDeId: input.alternativaDeId ?? null,
            vigente,
            creadoPorId: ctx.usuario!.id,
          },
        });
        const v = await tx.cpqVersion.create({
          data: {
            tenantId: ctx.tenantId,
            cotizacionId: c.id,
            numero: 1,
            estado: "borrador",
            moneda: input.moneda,
            validaHasta: new Date(`${validaHasta}T00:00:00Z`),
            margenModo: "margen_sobre_venta",
            margenObjetivoPct: null,
            ventaMensualClp: null,
            enviadaEn: null,
            revision: 1,
            creadoPorId: ctx.usuario!.id,
          },
        });
        await ctx.eventos.emitir(tx, {
          tipo: "cpq.cotizacion.creada",
          entidadTipo: "cotizacion",
          entidadId: c.id,
          payload: { codigo, negocioId: negocio.id, vigente },
        });
        return { id: c.id, codigo, versionId: v.id, vigente };
      });
    } catch (e) {
      // Carrera por «una vigente por negocio»: la otra transacción llegó primero.
      if ((e as { code?: unknown } | null)?.code === "P2002")
        throw conflicto("El negocio ya tiene una cotización vigente: reintenta como alternativa.");
      throw e;
    }
  },
});
