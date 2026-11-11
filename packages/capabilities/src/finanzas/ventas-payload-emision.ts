import type { PayloadEmisionDte, TipoDteVentaSii } from "@opai/integrations";
import type { AmbienteSii } from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { cafGuardadoParaEmitir, MENSAJE_FALLO_CAF } from "./caf-guardado";
import { emisorTributarioDe, mensajeFaltantesEmisor } from "./emisor-tributario";
import { mensajeFaltantesReceptor } from "./receptor-tributario";
import { camposReceptorDteEnPayload, type receptorDteDe } from "./ventas-comun";

type DocEmision = {
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  fechaVencimiento?: string;
  glosa: string | null;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoTotal: number;
  lineas: readonly { orden: number; glosa: string; monto: number }[];
  referencias?: readonly {
    tipoDteRef: number;
    folioRef: number;
    fechaRef?: Date | null;
    codigoRef: number;
    razonRef: string | null;
  }[];
};

async function leerCafXmlDe(ctx: Contexto, tipoDte: number, folio: number, rutEmisor: string): Promise<string> {
  const rangos = await ctx.db.dteFolio.findMany({
    where: { tipoDte, activo: true },
    orderBy: [{ folioDesde: "asc" }],
  });
  const rango = rangos.find((r) => folio >= r.folioDesde && folio <= r.folioHasta && r.cafSecretoId);
  if (!rango?.cafSecretoId) {
    throw reglaDeNegocio("No hay CAF activo para este folio; cargue un CAF antes de emitir.");
  }
  // Bytes ISO-8859-1 del CAF, nunca decodificados como UTF-8 (CAR-240): íntegro, del RUT emisor y del tipo y folio.
  const caf = await cafGuardadoParaEmitir(ctx, { cafSecretoId: rango.cafSecretoId, rutEmisor, tipoDte, folio });
  if (!caf.ok) throw reglaDeNegocio(MENSAJE_FALLO_CAF[caf.fallo]);
  return caf.xml;
}

/** Arma el payload completo para el adaptador SII (SimpleAPI v1 o simulado). */
export async function payloadEmisionDteDe(
  ctx: Contexto,
  p: {
    ambiente: AmbienteSii;
    rutEmisor: string;
    cuenta: Parameters<typeof receptorDteDe>[0] & { rut: string };
    doc: DocEmision;
    incluirCaf: boolean;
  },
): Promise<PayloadEmisionDte> {
  // Con el proveedor real, sin los datos tributarios del emisor (ACTECO incluido) SimpleAPI rechaza el DTE (CAR-240).
  const faltaEmisor = p.incluirCaf ? mensajeFaltantesEmisor(await emisorTributarioDe(ctx)) : null;
  if (faltaEmisor) throw reglaDeNegocio(`${faltaEmisor} El documento sigue sin emitir y el folio no se usó.`);
  // Con el proveedor real (el que lleva CAF) no se emite sin giro, dirección y comuna del receptor (CAR-240): se
  // corta antes de firmar, así que el borrador sigue sin emitir y el folio no se usa.
  const falta = p.incluirCaf ? mensajeFaltantesReceptor(p.cuenta) : null;
  if (falta) throw reglaDeNegocio(`${falta} El documento sigue sin emitir y el folio no se usó.`);
  const tipo = p.doc.tipoDte as TipoDteVentaSii;
  const lineas = p.doc.lineas
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((l) => ({ orden: l.orden, glosa: l.glosa, monto: l.monto }));
  const referencias =
    p.doc.referencias?.map((r) => ({
      tipoDte: r.tipoDteRef,
      folio: r.folioRef,
      ...(r.fechaRef ? { fecha: r.fechaRef.toISOString().slice(0, 10) } : {}),
      // CodRef (anula / corrige texto / corrige monto) solo aplica a una NC o ND; en una factura las referencias
      // 801-804 y 52 no lo llevan.
      ...(p.doc.tipoDte === 61 || p.doc.tipoDte === 56 ? { codigo: r.codigoRef } : {}),
      ...(r.razonRef ? { razon: r.razonRef } : {}),
    })) ?? [];
  const cafXml = p.incluirCaf ? await leerCafXmlDe(ctx, tipo, p.doc.folio, p.rutEmisor) : undefined;
  return {
    ambiente: p.ambiente,
    tipoDte: tipo,
    folio: p.doc.folio,
    fechaEmision: p.doc.fechaEmision,
    ...(p.doc.fechaVencimiento ? { fechaVencimiento: p.doc.fechaVencimiento } : {}),
    rutEmisor: p.rutEmisor,
    rutReceptor: p.cuenta.rut!,
    ...camposReceptorDteEnPayload(p.cuenta),
    montos: {
      neto: p.doc.montoNeto,
      exento: p.doc.montoExento,
      iva: p.doc.montoIva,
      total: p.doc.montoTotal,
    },
    ...(p.doc.glosa ? { glosa: p.doc.glosa } : {}),
    lineas,
    ...(referencias.length > 0 ? { referencias } : {}),
    ...(cafXml ? { cafXml } : {}),
  };
}
