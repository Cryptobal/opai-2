import {
  VALORES_TIPO_CUENTA_BANCARIA,
  bancoPorCodigo,
  codigoSbif,
  etiquetaTipoCuenta,
  nombreBanco,
  tipoCuentaCanonico,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";

/** Lectura contra el catálogo; lo escrito a mano antes del selector se reconoce si se puede, pero queda por corregir. */
export function catalogoDe(banco: string | null | undefined, tipo: string | null | undefined) {
  const tipoCanon = tipoCuentaCanonico(tipo);
  return {
    bancoNombre: nombreBanco(codigoSbif(banco)),
    tipoCuentaEtiqueta: etiquetaTipoCuenta(tipoCanon),
    porCorregir: Boolean((banco && !bancoPorCodigo(banco)) || (tipo && tipoCanon !== tipo)),
  };
}

/** Aprobar exige banco y tipo de cuenta del catálogo (la nómina de pago usa el código SBIF). */
export function exigirCatalogo(s: { bancoCodigo: string | null; tipoCuenta: string | null }) {
  if (
    !bancoPorCodigo(s.bancoCodigo) ||
    !VALORES_TIPO_CUENTA_BANCARIA.some((t) => t === s.tipoCuenta)
  )
    throw reglaDeNegocio(
      "La solicitud tiene un banco o tipo de cuenta fuera del catálogo: recházala y registra una nueva.",
    );
}

