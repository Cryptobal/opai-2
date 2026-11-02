import { validarCaf } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { hoy } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export function errorDeValidacionCaf(
  codigo: "xml_invalido" | "rut_distinto" | "tipo_no_habilitado" | "solape" | "vencido" | "no_sintetico",
): never {
  switch (codigo) {
    case "xml_invalido":
      throw reglaDeNegocio("El XML del CAF no es válido o está corrupto.");
    case "rut_distinto":
      throw reglaDeNegocio("El RUT del CAF no coincide con el RUT emisor configurado.");
    case "tipo_no_habilitado":
      throw reglaDeNegocio("El tipo de DTE del CAF no está habilitado para este tenant.");
    case "solape":
      throw reglaDeNegocio(
        "El rango del CAF ya fue cargado o se solapa con un rango existente del tenant.",
      );
    case "vencido":
      throw reglaDeNegocio("El CAF está vencido; solicite uno nuevo al SII.");
    default:
      throw reglaDeNegocio("No se pudo validar el CAF.");
  }
}

export function esViolacionSolapeFolios(error: unknown): boolean {
  const meta = (error as { meta?: { code?: string; message?: string } } | null)?.meta;
  if (meta?.code === "23P01") return true;
  const msg = String(meta?.message ?? (error as Error)?.message ?? "");
  return msg.includes("dte_folios_rango_sin_solape") || msg.includes("exclusion constraint");
}

export async function ultimoFolioOpai1AntesCorte(
  db: Pick<Contexto["db"], "documentoEmitido">,
  tipoDte: number,
  fechaCorte1_0: Date | null | undefined,
): Promise<number | null> {
  if (!fechaCorte1_0) return null;
  const agg = await db.documentoEmitido.aggregate({
    where: {
      tipoDte,
      folio: { not: null },
      fechaEmision: { lt: fechaCorte1_0 },
    },
    _max: { folio: true },
  });
  return agg._max.folio ?? null;
}

export function validarCafConRangos(
  cafXml: string,
  rutEmisor: string,
  rangosCargados: readonly { folioDesde: number; folioHasta: number }[],
) {
  const validacion = validarCaf({
    xml: cafXml,
    rutEmisorEsperado: rutEmisor,
    hoyIso: hoy(),
    rangosCargados,
  });
  if (!validacion.ok) errorDeValidacionCaf(validacion.error);
  return validacion.lectura;
}

export type RangoFolioTx = Awaited<
  ReturnType<TenantTx["dteFolio"]["findMany"]>
>[number];
