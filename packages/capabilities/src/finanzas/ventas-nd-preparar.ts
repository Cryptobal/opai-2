// Nota de débito (56) que anula una nota de crédito (CAR-221 · A2). Misma disciplina que la NC: la firma remota corre
// fuera de la transacción de base, con el folio previsto y un id generado aquí; la transacción revalida todo.
import { randomUUID } from "node:crypto";

import { z } from "zod";

import { validarMontosVenta } from "@opai/domain";

import { hoy } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { adaptadorSiiDe } from "./adaptador-sii";
import { ambienteDe, cuentaDe, rutEmisorDe } from "./ventas-comun";
import { foliosPrevistos } from "./ventas-folios-logica";
import { payloadEmisionDteDe } from "./ventas-payload-emision";
import { guardarXmlFirmadoDte } from "./ventas-xml";

export type NdPreparada = { documentoId: string; folio: number; fechaEmision: string; timbrePdf417: string };

const ndPreparadaSchema = z.object({
  documentoId: z.string(),
  folio: z.number().int(),
  fechaEmision: z.string(),
  timbrePdf417: z.string(),
});

export const leerNdPreparada = (preparado: unknown): NdPreparada | null => {
  const r = ndPreparadaSchema.safeParse(preparado);
  return r.success ? r.data : null;
};

/** Carga la NC y valida que pueda anularse con una nota de débito. Lo usa la vista previa y la firma. */
export async function cargarNcAnulable(ctx: Pick<Contexto, "db">, notaCreditoId: string) {
  const nc = await ctx.db.documentoEmitido.findFirst({ where: { id: notaCreditoId }, include: { lineas: { orderBy: { orden: "asc" } } } });
  if (!nc) throw noEncontrado("La nota de crédito");
  if (nc.tipoDte !== 61) throw reglaDeNegocio("La nota de débito solo anula una nota de crédito (61).");
  if (nc.folio == null || (nc.estadoDte !== "enviado" && nc.estadoDte !== "aceptado")) {
    throw reglaDeNegocio("La nota de crédito debe estar emitida y vigente para anularla.");
  }
  const previa = await ctx.db.documentoEmitido.findFirst({
    where: { documentoReferenciaId: nc.id, tipoDte: 56 },
    select: { folio: true },
  });
  if (previa) throw reglaDeNegocio(`Esta nota de crédito ya fue anulada por la nota de débito ${previa.folio ?? ""}.`.trim());
  const error = validarMontosVenta(56, {
    neto: nc.montoNeto, exento: nc.montoExento, iva: nc.montoIva, otros: nc.montoOtros, total: nc.montoTotal,
  });
  if (error) throw reglaDeNegocio(error);
  return nc;
}

export async function prepararNotaDebito(ctx: Contexto, input: { notaCreditoId: string; motivo: string }): Promise<NdPreparada> {
  const nc = await cargarNcAnulable(ctx, input.notaCreditoId);
  const cuenta = await cuentaDe(ctx, nc.cuentaId);
  if (!cuenta.rut) throw reglaDeNegocio("El cliente debe tener RUT para emitir la nota de débito.");
  const adaptador = await adaptadorSiiDe(ctx);
  if (!adaptador.disponible) throw reglaDeNegocio("El adaptador SII no está disponible.");
  const folio = (await foliosPrevistos(ctx, 56, 1))[0];
  if (folio == null || nc.folio == null) throw reglaDeNegocio("No hay folios disponibles para el DTE 56. Cargue un CAF.");
  const emision = hoy();
  const documentoId = randomUUID();
  const payload = await payloadEmisionDteDe(ctx, {
    ambiente: await ambienteDe(ctx),
    rutEmisor: await rutEmisorDe(ctx),
    cuenta: { ...cuenta, rut: cuenta.rut },
    doc: {
      tipoDte: 56, folio, fechaEmision: emision, glosa: input.motivo,
      montoNeto: nc.montoNeto, montoExento: nc.montoExento, montoIva: nc.montoIva, montoTotal: nc.montoTotal,
      lineas: nc.lineas.map((l) => ({ orden: l.orden, glosa: l.glosa, monto: l.monto })),
      referencias: [{ tipoDteRef: 61, folioRef: nc.folio, fechaRef: nc.fechaEmision, codigoRef: 1, razonRef: input.motivo }],
    },
    incluirCaf: adaptador.nombre !== "simulado",
  });
  const firmado = await adaptador.firmar(payload);
  if (adaptador.nombre !== "simulado") await guardarXmlFirmadoDte(ctx, documentoId, firmado.xml);
  return { documentoId, folio, fechaEmision: emision, timbrePdf417: firmado.timbrePdf417 };
}
