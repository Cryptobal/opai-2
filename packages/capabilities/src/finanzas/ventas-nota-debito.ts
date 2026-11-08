import { z } from "zod";

import { CESION_DEFECTO_EMITIDO, validarMontosVenta } from "@opai/domain";

import { defineCapability } from "../define";
import { aFecha, escribirConEvento } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { vistaDeDocumento } from "./ventas-consulta";
import { PERMISO_VENTAS, consumirFolio, cuentaDe, documentoEmitidoIdSchema } from "./ventas-comun";
import { cargarNcAnulable, leerNdPreparada, prepararNotaDebito } from "./ventas-nd-preparar";
import { claveXmlDte, descartarXmlPreparado } from "./ventas-xml";
import { adaptadorSiiDe } from "./adaptador-sii";
import { ventaSchema } from "./vistas-venta";

export const ventasEmitirNotaDebito = defineCapability({
  id: "finanzas.ventas.emitir_nota_debito",
  descripcion:
    "Emite una nota de débito (56) que anula una nota de crédito ya emitida: la nota de crédito deja de descontar y lo que había rebajado vuelve a ser deuda de la factura. Exige RUT del cliente y un CAF de notas de débito.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    notaCreditoId: documentoEmitidoIdSchema,
    motivo: z.string().trim().min(3).max(300),
  }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  // La firma (llamada remota) va antes de la transacción de la escritura.
  preparar: (ctx, input) => prepararNotaDebito(ctx, input),
  async handler(ctx, input, { dryRun, preparado }) {
    const nc = await cargarNcAnulable(ctx, input.notaCreditoId);
    const cuenta = await cuentaDe(ctx, nc.cuentaId);
    if (dryRun) {
      const folio = await consumirFolio(ctx, 56, true);
      const { vistaVenta } = await import("./vistas-venta");
      const lineas = nc.lineas.map((l) => ({ id: "dry", orden: l.orden, glosa: l.glosa, monto: l.monto }));
      return vistaVenta({ ...nc, id: "", tipoDte: 56, folio, estadoDte: "enviado", glosa: input.motivo, documentoReferenciaId: nc.id, lineas }, cuenta, lineas);
    }
    const p = leerNdPreparada(preparado);
    if (!p) throw reglaDeNegocio("La nota de débito no llegó firmada a la emisión; reintente.");
    const adaptador = await adaptadorSiiDe(ctx);
    let folioEmitido = 0;
    const creado = await escribirConEvento(
      ctx,
      { tipo: "finanzas.venta.nota_debito_emitida", entidadTipo: "documento_emitido", payload: () => ({ folio: folioEmitido, notaCreditoId: nc.id }) },
      async (tx) => {
        // Bloquea la NC y revalida: otra anulación concurrente no puede duplicar la nota de débito.
        await tx.$queryRaw`SELECT id FROM finanzas.documentos_emitidos WHERE id = ${nc.id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
        const vigente = await cargarNcAnulable({ db: tx }, nc.id);
        folioEmitido = await consumirFolio(ctx, 56, false, tx);
        if (folioEmitido !== p.folio) throw reglaDeNegocio("El folio cambió mientras se firmaba la nota de débito; reintente la emisión.");
        const error = validarMontosVenta(56, { neto: vigente.montoNeto, exento: vigente.montoExento, iva: vigente.montoIva, otros: vigente.montoOtros, total: vigente.montoTotal });
        if (error) throw reglaDeNegocio(error);
        const doc = await tx.documentoEmitido.create({
          data: {
            id: p.documentoId, tenantId: ctx.tenantId, cuentaId: vigente.cuentaId, instalacionId: vigente.instalacionId,
            cotizacionId: vigente.cotizacionId, tipoDte: 56, folio: folioEmitido, fechaEmision: aFecha(p.fechaEmision),
            fechaVencimiento: vigente.fechaVencimiento, montoNeto: vigente.montoNeto, montoExento: vigente.montoExento,
            montoIva: vigente.montoIva, montoOtros: 0, montoTotal: vigente.montoTotal, estadoDte: "enviado", glosa: input.motivo,
            timbrePdf417: p.timbrePdf417, documentoReferenciaId: vigente.id, codigoReferencia: 1, motivoNc: input.motivo,
            cesionEstado: CESION_DEFECTO_EMITIDO,
            ...(adaptador.nombre !== "simulado" ? { xmlStorageKey: claveXmlDte(p.documentoId) } : {}),
            lineas: { create: vigente.lineas.map((l) => ({ tenantId: ctx.tenantId, orden: l.orden, glosa: l.glosa, monto: l.monto })) },
            referencias: { create: { tenantId: ctx.tenantId, tipoDteRef: 61, folioRef: vigente.folio ?? 0, fechaRef: vigente.fechaEmision, codigoRef: 1, razonRef: input.motivo } },
          },
        });
        const { count } = await tx.documentoEmitido.updateMany({ where: { id: vigente.id, estadoDte: { in: ["enviado", "aceptado"] } }, data: { estadoDte: "anulado_nd" } });
        if (count !== 1) throw reglaDeNegocio("No se pudo marcar la nota de crédito como anulada; reintente.");
        await restaurarFacturaAnulada(tx, vigente.documentoReferenciaId, vigente.id);
        return doc;
      },
    ).catch(async (e: unknown) => {
      await descartarXmlPreparado(ctx, claveXmlDte(p.documentoId));
      throw e;
    });
    return vistaDeDocumento(ctx, creado.id);
  },
});

/**
 * La factura quedó «anulada por NC» solo si esa NC la anulaba entera. Al anular la NC con una nota de débito vuelve a
 * estar vigente, salvo que otra NC de anulación siga activa. Recupera «aceptada» si el SII ya la había aceptado.
 */
async function restaurarFacturaAnulada(
  tx: Parameters<Parameters<typeof escribirConEvento>[2]>[0],
  facturaId: string | null,
  ncAnuladaId: string,
): Promise<void> {
  if (!facturaId) return;
  const otra = await tx.documentoEmitido.findFirst({
    where: { documentoReferenciaId: facturaId, tipoDte: 61, codigoReferencia: 1, estadoDte: { in: ["enviado", "aceptado"] }, id: { not: ncAnuladaId } },
    select: { id: true },
  });
  if (otra) return;
  const aceptada = await tx.dteEnvio.findFirst({ where: { documentoId: facturaId, estado: "aceptado" }, select: { id: true } });
  await tx.documentoEmitido.updateMany({ where: { id: facturaId, estadoDte: "anulado_nc" }, data: { estadoDte: aceptada ? "aceptado" : "enviado" } });
}
