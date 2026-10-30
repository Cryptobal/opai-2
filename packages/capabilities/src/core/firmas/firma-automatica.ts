import { z } from "zod";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { claseSchema, PERMISO_FIRMAS_CONFIG } from "./comun";
import { autorizacionSchema, iso } from "./firmante-empresa";

/** Autoriza la firma automática del representante en una clase, con vigencia y revocable (R16, P5). */
export const firmasFirmaAutomaticaAutorizar = defineCapability({
  id: "core.firmas.firma_automatica_autorizar",
  // Solo personas: autorizar la firma automática del representante solo puede hacerlo él (R16).
  soloPersonas: true,
  descripcion:
    "Autoriza que la firma del representante de la empresa salga automática en un tipo de documento, con vigencia opcional, revocable y auditada; reemplaza una autorización vigente de la misma clase (R16, P5).",
  permiso: PERMISO_FIRMAS_CONFIG,
  input: z.object({
    firmanteEmpresaId: uuidSchema,
    clase: claseSchema,
    vigenciaHasta: z.iso.datetime().nullable().optional(),
  }),
  output: autorizacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const fe = await ctx.db.firmanteEmpresa.findUnique({ where: { id: input.firmanteEmpresaId } });
    if (!fe) throw noEncontrado("El firmante de la empresa");
    if (!fe.activo) throw reglaDeNegocio("El firmante de la empresa está inactivo.");
    const hasta = input.vigenciaHasta ? new Date(input.vigenciaHasta) : null;
    if (hasta && hasta.getTime() <= Date.now()) {
      throw reglaDeNegocio("La vigencia debe terminar en el futuro.");
    }
    if (dryRun) {
      return {
        id: "",
        firmanteEmpresaId: input.firmanteEmpresaId,
        clase: input.clase,
        vigenciaDesde: new Date().toISOString(),
        vigenciaHasta: iso(hasta),
        revocadaEn: null,
      };
    }
    const a = await ctx.transaccion(async (tx) => {
      // Una sola autorización vigente por firmante y clase: revoca las anteriores (R16).
      await tx.autorizacionFirmaAutomatica.updateMany({
        where: { firmanteEmpresaId: fe.id, clase: input.clase, revocadaEn: null },
        data: { revocadaEn: new Date() },
      });
      // La autorización se audita sola en su transacción (ADR-052, R16); sin consumidor de evento aún.
      return tx.autorizacionFirmaAutomatica.create({
        data: {
          tenantId: ctx.tenantId,
          firmanteEmpresaId: fe.id,
          clase: input.clase,
          vigenciaHasta: hasta,
          autorizadaPorId: ctx.actor.id ?? ctx.usuario?.id ?? fe.usuarioId,
        },
      });
    });
    return {
      id: a.id,
      firmanteEmpresaId: a.firmanteEmpresaId,
      clase: a.clase,
      vigenciaDesde: a.vigenciaDesde.toISOString(),
      vigenciaHasta: iso(a.vigenciaHasta),
      revocadaEn: iso(a.revocadaEn),
    };
  },
});

/** Revoca una autorización de firma automática (R16). */
export const firmasFirmaAutomaticaRevocar = defineCapability({
  id: "core.firmas.firma_automatica_revocar",
  soloPersonas: true,
  descripcion:
    "Revoca una autorización de firma automática del representante de la empresa; desde la revocación esa clase ya no sale firmada automáticamente (R16).",
  permiso: PERMISO_FIRMAS_CONFIG,
  input: z.object({ autorizacionId: uuidSchema }),
  output: autorizacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const a = await ctx.db.autorizacionFirmaAutomatica.findUnique({
      where: { id: input.autorizacionId },
    });
    if (!a) throw noEncontrado("La autorización");
    if (a.revocadaEn) throw conflicto("La autorización ya está revocada.");
    const base = {
      id: a.id,
      firmanteEmpresaId: a.firmanteEmpresaId,
      clase: a.clase,
      vigenciaDesde: a.vigenciaDesde.toISOString(),
      vigenciaHasta: iso(a.vigenciaHasta),
    };
    if (dryRun) return { ...base, revocadaEn: new Date().toISOString() };
    const r = await ctx.transaccion((tx) =>
      tx.autorizacionFirmaAutomatica.update({
        where: { id: a.id },
        data: { revocadaEn: new Date() },
      }),
    );
    return { ...base, revocadaEn: iso(r.revocadaEn) };
  },
});
