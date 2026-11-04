import { z } from "zod";

import { existeAnulacionCod1, puedeCederDocumento, simularCesion } from "@opai/domain";

import { defineCapability } from "../define";
import { escribirConEvento } from "../core/maestros/comun";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { adaptadorCesionDe } from "./adaptador-cesion";
import { notasCreditoPreviasDe } from "./ventas-nc-comun";
import { PERMISO_VENTAS, documentoEmitidoIdSchema, rutEmisorDe } from "./ventas-comun";
import { vistaDeDocumento } from "./ventas-consulta";
import { xmlBase64ParaCesion } from "./ventas-xml";
import { ventaSchema } from "./vistas-venta";
import type { Contexto } from "../types";

async function revertirReservaCesion(ctx: Contexto, docId: string, cesionId: string) {
  await ctx.transaccion(async (tx) => {
    await tx.cesion.update({ where: { id: cesionId }, data: { estado: "anulada" } });
    await tx.documentoEmitido.update({
      where: { id: docId },
      data: { cesionEstado: "no_cedido", cesionOperacionId: null, cesionProveedor: null },
    });
  });
}

export const ventasCesionCeder = defineCapability({
  id: "finanzas.ventas.cesion_ceder",
  descripcion:
    "Cede una factura aceptada al factor vía Octava (AEC al RPETC). Requiere XML local y deja la operación en seguimiento.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    factorRut: z.string().trim().min(3).max(20),
    factorNombre: z.string().trim().max(120).optional(),
    /** Octava (CedeDte) exige datos de contacto del cesionario. */
    factorEmail: z.string().trim().email().max(40).optional(),
    factorDireccion: z.string().trim().min(3).max(70).optional(),
    tasaBps: z.number().int().min(0).max(10_000).default(250),
  }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    const previas = await notasCreditoPreviasDe(ctx, doc.id);
    const bloqueo = puedeCederDocumento({
      tipoDte: doc.tipoDte,
      estadoDte: doc.estadoDte,
      cesionEstado: doc.cesionEstado,
      xmlStorageKey: doc.xmlStorageKey,
      estadoCobro: doc.estadoCobro,
      montoTotal: doc.montoTotal,
      montoCobrado: doc.montoCobrado,
      anuladaPorNc: existeAnulacionCod1(previas),
    });
    if (bloqueo) throw reglaDeNegocio(bloqueo);
    const calc = simularCesion(doc.montoTotal, input.tasaBps);
    if (dryRun) return vistaDeDocumento(ctx, doc.id);
    const rutEmisor = await rutEmisorDe(ctx);
    const cuenta = await ctx.db.cuenta.findFirst({ where: { id: doc.cuentaId }, select: { rut: true, emailDte: true } });
    if (!cuenta?.rut) throw reglaDeNegocio("El cliente debe tener RUT.");
    const adaptador = await adaptadorCesionDe(ctx);
    if (!adaptador.disponible) throw reglaDeNegocio("Configure la integración de cesión (Octava) antes de ceder.");
    let cesionId = "";
    await ctx.transaccion(async (tx) => {
      const { count } = await tx.documentoEmitido.updateMany({
        where: {
          id: doc.id,
          estadoDte: "aceptado",
          cesionEstado: "no_cedido",
          cesionOperacionId: null,
        },
        data: { cesionEstado: "emitido" },
      });
      if (count !== 1) throw conflicto("La factura ya está en cesión o fue cedida.");
      const cesion = await tx.cesion.create({
        data: {
          tenantId: ctx.tenantId,
          documentoId: doc.id,
          factorRut: input.factorRut,
          factorNombre: input.factorNombre ?? null,
          tasaBps: input.tasaBps,
          anticipo: calc.anticipo,
          merma: calc.merma,
          saldoFactor: calc.saldoFactor,
          estado: "enviada",
          proveedor: adaptador.nombre,
        },
      });
      cesionId = cesion.id;
      await tx.documentoEmitido.update({
        where: { id: doc.id },
        data: { cesionOperacionId: cesion.id, cesionProveedor: adaptador.nombre },
      });
    });
    let envio;
    try {
      envio = await adaptador.enviar({
        documentoId: doc.id,
        folio: doc.folio!,
        rutEmisor,
        rutDeudor: cuenta.rut,
        montoTotal: doc.montoTotal,
        xmlBase64: await xmlBase64ParaCesion(ctx, doc, adaptador),
        factorRut: input.factorRut,
        tasaBps: input.tasaBps,
        tipoDte: doc.tipoDte,
        ...(input.factorNombre ? { factorNombre: input.factorNombre } : {}),
        ...(input.factorEmail ? { factorEmail: input.factorEmail } : {}),
        ...(input.factorDireccion ? { factorDireccion: input.factorDireccion } : {}),
        ...(cuenta.emailDte ? { emailDeudor: cuenta.emailDte } : {}),
        ...(doc.fechaVencimiento ? { fechaVencimiento: doc.fechaVencimiento.toISOString().slice(0, 10) } : {}),
      });
    } catch (e) {
      await revertirReservaCesion(ctx, doc.id, cesionId);
      throw reglaDeNegocio(e instanceof Error ? e.message : "Falló el envío de la cesión al proveedor.");
    }
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.cedida",
        entidadTipo: "documento_emitido",
        payload: () => ({ operacionExternaId: envio.operacionExternaId }),
      },
      async (tx) => {
        await tx.cesion.update({
          where: { id: cesionId },
          data: { estado: envio.estado, operacionExternaId: envio.operacionExternaId },
        });
        await tx.documentoEmitido.update({
          where: { id: doc.id },
          data: { cesionEstado: "cedido", estadoCobro: "cedida" },
        });
        return { id: doc.id };
      },
    );
    return vistaDeDocumento(ctx, doc.id);
  },
});
