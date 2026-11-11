// Firma del DTE FUERA de la transacción de base (CAR-196): la llamada a SimpleAPI es remota y lenta, y no debe
// retener la conexión ni los locks de la escritura. Se firma con el folio que se asignaría (sin consumirlo) y la
// transacción de `emitirBorrador` revalida que ese siguiera siendo el folio disponible (ver `foliosPrevistos`).
import { createHash, randomUUID } from "node:crypto";

import { validarMontosVenta, type TipoDteVenta } from "@opai/domain";

import { hoy } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { adaptadorSiiDe } from "./adaptador-sii";
import { comoReglaSiProveedorSii } from "./errores-sii";
import { ambienteDe, cuentaDe, rutEmisorDe } from "./ventas-comun";
import { foliosPrevistos } from "./ventas-folios-logica";
import { exigirOrigenNotaDebito } from "./ventas-nd-cargo";
import { payloadEmisionDteDe } from "./ventas-payload-emision";
import { guardarXmlFirmadoDte } from "./ventas-xml";

export type EmisionPreparada = {
  documentoId: string;
  folio: number;
  fechaEmision: string;
  timbrePdf417: string;
  /** Clave provisional única de este intento; la transacción la fija como `xmlStorageKey` (null si no hay XML). */
  xmlStorageKey: string | null;
  /** Huella del borrador firmado: si cambió antes de la transacción, no se emite. */
  huella: string;
};

type DocHuella = {
  cuentaId: string;
  fechaEmision: Date | null;
  fechaVencimiento: Date | null;
  glosa: string | null;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoOtros: number;
  montoTotal: number;
  lineas: readonly { orden: number; glosa: string; monto: number }[];
  referencias: readonly { tipoDteRef: number; folioRef: number; codigoRef: number; razonRef: string | null; fechaRef: Date | null }[];
};

export function huellaBorrador(d: DocHuella): string {
  const contenido = JSON.stringify([
    d.cuentaId, d.fechaEmision?.toISOString().slice(0, 10) ?? null, d.fechaVencimiento?.toISOString().slice(0, 10) ?? null, d.glosa,
    d.montoNeto, d.montoExento, d.montoIva, d.montoOtros, d.montoTotal,
    d.lineas.map((l) => [l.orden, l.glosa, l.monto]),
    d.referencias
      .map((r) => [r.tipoDteRef, r.folioRef, r.codigoRef, r.razonRef, r.fechaRef?.toISOString().slice(0, 10) ?? null])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ]);
  return createHash("sha256").update(contenido).digest("hex");
}

/**
 * Condiciones que el borrador heredó de su programación al generarse: con «esperar OK» hace falta el OK del cliente y con
 * «exige OC» una orden de compra (la del seguimiento o una referencia 801). Cambiar la programación después no las altera.
 * Solo rigen los borradores generados con estas opciones (su corrida trae el día de envío de los previos); un borrador
 * manual o anterior se emite como antes.
 */
async function condicionesHeredadas(ctx: Contexto, doc: { id: string; referencias: { tipoDteRef: number }[] }) {
  const corrida = await ctx.db.ventasProgramacionCorrida.findFirst({
    where: { documentoId: doc.id },
    select: { previosEnviarEn: true },
  });
  if (!corrida?.previosEnviarEn) return;
  const seg = await ctx.db.ventasCierreSeguimiento.findFirst({ where: { documentoId: doc.id } });
  if (!seg) return;
  if (seg.requiereOk && seg.estado !== "ok") throw reglaDeNegocio("Esperando el OK del cliente.");
  const tieneOc = Boolean(seg.ordenCompra || seg.hes) || doc.referencias.some((r) => r.tipoDteRef === 801);
  if (seg.requiereOcHes && !tieneOc) throw reglaDeNegocio("Falta la orden de compra que exige la programación.");
}

/** Carga el borrador y valida que pueda emitirse; lo comparten la vista previa y la firma. */
export async function cargarBorradorEmitible(ctx: Contexto, documentoId: string) {
  const doc = await ctx.db.documentoEmitido.findFirst({
    where: { id: documentoId },
    include: { lineas: { orderBy: { orden: "asc" } }, referencias: true },
  });
  if (!doc) throw noEncontrado("El documento");
  if (doc.estadoDte !== "borrador") throw reglaDeNegocio("Solo se emiten borradores.");
  if (doc.folio != null) throw reglaDeNegocio("El borrador ya tiene folio asignado.");
  if (doc.tipoDte === 56) await exigirOrigenNotaDebito(ctx, doc);
  else if (doc.tipoDte !== 33 && doc.tipoDte !== 34) throw reglaDeNegocio("Tipo de DTE no emitible desde borrador.");
  await condicionesHeredadas(ctx, doc);
  const cuenta = await cuentaDe(ctx, doc.cuentaId);
  if (!cuenta.rut) throw reglaDeNegocio("El cliente debe tener RUT para emitir el DTE.");
  const tipo = doc.tipoDte as TipoDteVenta;
  const error = validarMontosVenta(tipo, {
    neto: doc.montoNeto,
    exento: doc.montoExento,
    iva: doc.montoIva,
    otros: doc.montoOtros,
    total: doc.montoTotal,
  });
  if (error) throw reglaDeNegocio(error);
  return { doc, cuenta: { ...cuenta, rut: cuenta.rut }, tipo };
}

/** Firma un borrador con el folio indicado (o el próximo disponible) y guarda el XML. No toca la base. */
export async function prepararEmision(ctx: Contexto, documentoId: string, folioAsignado?: number): Promise<EmisionPreparada> {
  const { doc, cuenta, tipo } = await cargarBorradorEmitible(ctx, documentoId);
  const adaptador = await adaptadorSiiDe(ctx);
  if (!adaptador.disponible) throw reglaDeNegocio("El adaptador SII no está disponible.");
  const folio = folioAsignado ?? (await foliosPrevistos(ctx, tipo, 1))[0];
  if (folio == null) throw reglaDeNegocio(`No hay folios disponibles para el DTE ${tipo}. Cargue un CAF.`);
  const emision = doc.fechaEmision?.toISOString().slice(0, 10) ?? hoy();
  const payload = await payloadEmisionDteDe(ctx, {
    ambiente: await ambienteDe(ctx),
    rutEmisor: await rutEmisorDe(ctx),
    cuenta,
    doc: {
      tipoDte: doc.tipoDte,
      folio,
      fechaEmision: emision,
      glosa: doc.glosa,
      montoNeto: doc.montoNeto,
      montoExento: doc.montoExento,
      montoIva: doc.montoIva,
      montoTotal: doc.montoTotal,
      lineas: doc.lineas,
      referencias: doc.referencias,
      ...(doc.fechaVencimiento ? { fechaVencimiento: doc.fechaVencimiento.toISOString().slice(0, 10) } : {}),
    },
    incluirCaf: adaptador.nombre !== "simulado",
  });
  // Un fallo del proveedor llega a la persona como regla de negocio con su motivo (CAR-242). Nada se escribió:
  // el folio solo se reclama después, dentro de la transacción de `emitirBorrador`.
  const firmado = await adaptador.firmar(payload).catch((e: unknown) => {
    throw comoReglaSiProveedorSii(e, "El borrador sigue sin emitir y el folio no se usó.");
  });
  // Clave única por intento: dos firmas concurrentes del mismo borrador no se pisan el XML (el de un documento
  // ya emitido nunca se sobrescribe); la transacción que gana fija su clave.
  const xmlStorageKey = adaptador.nombre === "simulado" ? null : `dte/${doc.id}/${randomUUID()}.xml`;
  if (xmlStorageKey) await guardarXmlFirmadoDte(ctx, doc.id, firmado.xml, xmlStorageKey);
  return {
    documentoId: doc.id,
    folio,
    fechaEmision: emision,
    timbrePdf417: firmado.timbrePdf417,
    xmlStorageKey,
    huella: huellaBorrador(doc),
  };
}
