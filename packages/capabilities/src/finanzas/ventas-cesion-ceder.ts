import { z } from "zod";

import { puedeCederDocumento, simularCesion } from "@opai/domain";

import { defineCapability } from "../define";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { adaptadorCesionDe } from "./adaptador-cesion";
import { PERMISO_VENTAS, documentoEmitidoIdSchema, rutEmisorDe } from "./ventas-comun";
import { vistaDeDocumento } from "./ventas-consulta";
import { ventaSchema } from "./vistas-venta";

export const ventasCesionCeder = defineCapability({
  id: "finanzas.ventas.cesion_ceder",
  descripcion:
    "Cede una factura aceptada al factor vía Octava (AEC al RPETC). Requiere XML local y deja la operación en seguimiento.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    factorRut: z.string().trim().min(3).max(20),
    factorNombre: z.string().trim().max(120).optional(),
    tasaBps: z.number().int().min(0).max(10_000).default(250),
  }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    const bloqueo = puedeCederDocumento({
      tipoDte: doc.tipoDte,
      estadoDte: doc.estadoDte,
      cesionEstado: doc.cesionEstado,
      xmlStorageKey: doc.xmlStorageKey,
    });
    if (bloqueo) throw reglaDeNegocio(bloqueo);
    const calc = simularCesion(doc.montoTotal, input.tasaBps);
    if (dryRun) return vistaDeDocumento(ctx, doc.id);
    const rutEmisor = await rutEmisorDe(ctx);
    const cuenta = await ctx.db.cuenta.findFirst({ where: { id: doc.cuentaId }, select: { rut: true } });
    if (!cuenta?.rut) throw reglaDeNegocio("El cliente debe tener RUT.");
    const adaptador = await adaptadorCesionDe(ctx);
    if (!adaptador.disponible) throw reglaDeNegocio("Configure la integración de cesión (Octava) antes de ceder.");
    const envio = await adaptador.enviar({
      documentoId: doc.id,
      folio: doc.folio!,
      rutEmisor,
      rutDeudor: cuenta.rut,
      montoTotal: doc.montoTotal,
      xmlBase64: Buffer.from(`<DTE folio="${doc.folio}"/>`, "utf8").toString("base64"),
      factorRut: input.factorRut,
      tasaBps: input.tasaBps,
    });
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.cedida",
        entidadTipo: "documento_emitido",
        payload: () => ({ operacionExternaId: envio.operacionExternaId }),
      },
      async (tx) => {
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
            estado: envio.estado,
            proveedor: adaptador.nombre,
            operacionExternaId: envio.operacionExternaId,
          },
        });
        await tx.documentoEmitido.update({
          where: { id: doc.id },
          data: {
            cesionEstado: "cedido",
            cesionProveedor: adaptador.nombre,
            cesionOperacionId: cesion.id,
          },
        });
        return { id: doc.id };
      },
    );
    return vistaDeDocumento(ctx, doc.id);
  },
});
