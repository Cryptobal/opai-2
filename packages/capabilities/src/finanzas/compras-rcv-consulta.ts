// Consulta del RCV de compras a SimpleAPI (CAR-273). Va siempre fuera de la transacción de escritura:
// es HTTP a un tercero, se cobra aunque falle y puede tardar más que el timeout de la transacción.
import { consultarRcvCompras, ErrorProveedorSii, type DocumentoRcv } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import { consumoBase } from "../integraciones/consumo-base";
import type { Contexto } from "../types";
import { credencialesSimpleApi } from "./adaptador-sii";
import type { FilaCompra } from "./compras-importar-nucleo";

const TIPOS = new Set([33, 34, 56, 61]);

export type ConsultaRcv = { tipo: "rcv"; anio: number; mes: number; documentos: FilaCompra[]; recibidos: number; omitidos: number };

export const esConsultaRcv = (v: unknown): v is ConsultaRcv =>
  typeof v === "object" && v !== null && (v as { tipo?: unknown }).tipo === "rcv";

const aFila = (d: DocumentoRcv): FilaCompra => ({
  proveedorRut: d.rutEmisor,
  ...(d.razonSocial ? { proveedorRazonSocial: d.razonSocial.slice(0, 160) } : {}),
  tipoDte: d.tipoDte as FilaCompra["tipoDte"],
  folio: d.folio,
  fechaEmision: d.fechaEmision,
  montoNeto: d.montoNeto,
  montoExento: d.montoExento,
  montoIva: d.montoIva,
  montoOtros: Math.max(0, d.montoTotal - d.montoNeto - d.montoExento - d.montoIva),
  montoTotal: d.montoTotal,
});

export async function consultarMes(ctx: Contexto, anio: number, mes: number): Promise<ConsultaRcv> {
  const creds = await credencialesSimpleApi(ctx);
  if (!creds) throw reglaDeNegocio("Falta configurar Emisión DTE (API key de SimpleAPI y certificado) para leer el RCV.");
  let consulta: Awaited<ReturnType<typeof consultarRcvCompras>>;
  try {
    consulta = await consultarRcvCompras(creds, mes, anio);
  } catch (e) {
    if (e instanceof ErrorProveedorSii) throw reglaDeNegocio(`SimpleAPI no entregó el RCV de ${mes}/${anio}: ${e.motivo}.`);
    throw e;
  } finally {
    // SimpleAPI cobra la consulta aunque falle: se mide siempre.
    await ctx.medidor
      .registrar({ ...consumoBase(ctx, "finanzas"), recurso: "sii.rcv", unidad: "consulta", cantidad: 1, yaIncurrido: true })
      .catch(() => undefined);
  }
  // Solo los tipos que acepta el libro de compras (33, 34, 56, 61); los demás se cuentan como omitidos.
  const documentos = consulta.documentos.filter((d) => TIPOS.has(d.tipoDte)).map(aFila);
  const omitidos = consulta.descartados + consulta.documentos.length - documentos.length;
  return { tipo: "rcv", anio, mes, documentos, recibidos: consulta.documentos.length, omitidos };
}
