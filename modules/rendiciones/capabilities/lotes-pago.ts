import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { codigoLote, codigoVisible, sinRendicionPropia } from "../domain";
import { uuidSchema } from "./esquemas";
import { loteSalidaSchema } from "./lotes-esquemas";
import { loteConSolicitantes, pasoPermitido } from "./lotes-flujo";
import { armarNomina, exigirFormatoConfirmado, xlsxDeNomina } from "./lotes-nomina";
import { anotarPasoLote } from "./lotes-util";
import { PERMISO_PAGAR } from "./permisos";
import { anotarPaso } from "./registro";
import { actorId, hoyChile } from "./util";

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD.");

export const lotesGenerarNomina = defineCapability({
  id: "rendiciones.lotes.generar_nomina",
  descripcion:
    "Genera la nómina de transferencias Santander de un lote aprobado y lo deja en «generado». Revisa que cada persona tenga RUT, cuenta y banco, y que el total de la nómina sea el del lote. Solo genera el archivo: OPAI no transmite nada al banco. No devuelve números de cuenta; el archivo lo baja una persona. Espera la confirmación del formato por Carlos.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  input: z.object({ id: uuidSchema }),
  output: loteSalidaSchema.extend({ beneficiarios: z.number().int(), huella: z.string().describe("SHA-256 del archivo, para verificar la descarga.") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    await exigirFormatoConfirmado(ctx);
    const { lote, solicitantes } = await loteConSolicitantes(ctx, input.id);
    pasoPermitido(lote.estado, "generado");
    if (!sinRendicionPropia(yo, solicitantes)) throw prohibido("Nadie genera la nómina de un lote con una rendición propia.");
    const n = await armarNomina(ctx, lote.items, codigoLote(lote.codigo));
    if (n.totalClp !== lote.totalClp) throw reglaDeNegocio("El total de la nómina no coincide con el del lote.");
    const salida = { id: lote.id, estado: "generado" as const, totalClp: lote.totalClp, cantidad: lote.cantidad, beneficiarios: n.filas, huella: n.huella };
    if (dryRun) return salida;
    await ctx.transaccion(async (tx) => {
      const r = await tx.lotePago.updateMany({ where: { id: lote.id, estado: "aprobado" }, data: { estado: "generado", generadoPorId: yo, generadoEn: new Date(), nominaHuella: n.huella } });
      if (r.count !== 1) throw conflicto("El lote cambió de estado mientras tanto.");
      await anotarPasoLote(ctx, tx, lote, { tipo: "generado", actorId: yo, desde: "aprobado", hasta: "generado", comentario: `Nómina de ${n.filas} beneficiarios` }, { beneficiarios: n.filas });
    });
    return salida;
  },
});

export const lotesDescargarNomina = defineCapability({
  id: "rendiciones.lotes.nomina_descargar",
  descripcion:
    "Entrega el archivo Excel de la nómina Santander de un lote generado o pagado, para que una persona lo suba al banco. Contiene cuentas bancarias, por eso solo lo pide una persona con sesión. Verifica que nada haya cambiado desde que se generó.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  soloPersonas: true,
  input: z.object({ id: uuidSchema }),
  output: z.object({ nombre: z.string(), mime: z.string(), base64: z.string(), personaIds: z.array(uuidSchema) }),
  efecto: "lectura",
  dryRun: false,
  // Revela cuentas de personas: audita solo los IDs de las personas, sin copiar datos.
  auditarLectura: (s) => s.personaIds,
  async handler(ctx, input) {
    await exigirFormatoConfirmado(ctx);
    const yo = actorId(ctx);
    const { lote, solicitantes } = await loteConSolicitantes(ctx, input.id);
    if (!sinRendicionPropia(yo, solicitantes)) throw prohibido("Nadie descarga la nómina de un lote con una rendición propia.");
    if (lote.estado !== "generado" && lote.estado !== "pagado") throw reglaDeNegocio("La nómina se descarga con el lote ya generado.");
    const n = await armarNomina(ctx, lote.items, codigoLote(lote.codigo));
    if (n.huella !== lote.nominaHuella) throw conflicto("La nómina cambió respecto de la que se generó: anula el lote y arma otro.");
    return {
      nombre: `nomina-santander-${codigoLote(lote.codigo)}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: await xlsxDeNomina(n.matriz),
      personaIds: [...new Set(lote.items.map((i) => i.personaId))],
    };
  },
});

export const lotesMarcarPagado = defineCapability({
  id: "rendiciones.lotes.marcar_pagado",
  descripcion:
    "Marca un lote como pagado, a mano, con la fecha de pago y la referencia (número de nómina o comprobante); sus rendiciones pasan a «Pagada». Es irreversible: un agente necesita la aprobación de una persona. OPAI no ejecuta ni verifica la transferencia. Nadie marca pagado un lote con una rendición propia.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  input: z.object({
    id: uuidSchema,
    fechaPago: fechaSchema.describe("Día en que se pagó, AAAA-MM-DD; no puede ser futuro."),
    referencia: z.string().trim().min(3).max(80).describe("Número de nómina o de comprobante del banco."),
    comprobanteDocumentoId: uuidSchema.optional().describe("Comprobante ya subido a core.documentos (opcional)."),
  }),
  output: loteSalidaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    if (input.fechaPago > hoyChile()) throw reglaDeNegocio("La fecha de pago no puede ser futura.");
    const { lote, solicitantes } = await loteConSolicitantes(ctx, input.id);
    pasoPermitido(lote.estado, "pagado");
    if (!sinRendicionPropia(yo, solicitantes)) throw prohibido("Nadie marca como pagado un lote con una rendición propia.");
    if (input.comprobanteDocumentoId && (await ctx.db.documento.count({ where: { id: input.comprobanteDocumentoId, estado: "disponible" } })) !== 1)
      throw reglaDeNegocio("El comprobante no existe entre los documentos de la empresa.");
    const salida = { id: lote.id, estado: "pagado" as const, totalClp: lote.totalClp, cantidad: lote.cantidad };
    if (dryRun) return salida;
    const ids = lote.items.map((i) => i.rendicionId);
    await ctx.transaccion(async (tx) => {
      const r = await tx.lotePago.updateMany({
        where: { id: lote.id, estado: lote.estado },
        data: { estado: "pagado", pagadoPorId: yo, pagadoEn: new Date(), fechaPago: new Date(`${input.fechaPago}T00:00:00.000Z`), referenciaPago: input.referencia, comprobanteDocumentoId: input.comprobanteDocumentoId ?? null },
      });
      if (r.count !== 1) throw conflicto("El lote cambió de estado mientras tanto.");
      const p = await tx.rendicion.updateMany({ where: { id: { in: ids }, estado: "aprobada" }, data: { estado: "pagada" } });
      if (p.count !== ids.length) throw conflicto("Una rendición del lote ya no está aprobada.");
      const rends = await tx.rendicion.findMany({ where: { id: { in: ids } }, select: { id: true, tenantId: true, codigo: true, solicitanteId: true, montoTotal: true } });
      for (const x of rends) await anotarPaso(ctx, tx, x, { tipo: "pagada", actorId: yo, desde: "aprobada", hasta: "pagada", comentario: `Lote ${codigoLote(lote.codigo)} · ${input.referencia}` }, { loteId: lote.id, montoTotal: x.montoTotal, solicitanteId: x.solicitanteId, codigo: codigoVisible(x.codigo) });
      await anotarPasoLote(ctx, tx, lote, { tipo: "pagado", actorId: yo, desde: lote.estado, hasta: "pagado", comentario: input.referencia }, { totalClp: lote.totalClp, cantidad: lote.cantidad });
    });
    return salida;
  },
});
