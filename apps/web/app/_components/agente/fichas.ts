import {
  debeDibujarFichas,
  esHrefFicha,
  listaCortaDeEntidades,
  pideFichas,
  textoRespaldoFichas,
} from "@opai/domain/agente-fichas";
import type { ReferenciaEntidad } from "./tipos";

export { debeDibujarFichas, textoRespaldoFichas };

/** Hasta 6 fichas si pidió tarjetas; si no, hasta 4 de entidad. */
export function fichasVisibles(
  pedido: string,
  refs: readonly ReferenciaEntidad[],
): ReferenciaEntidad[] {
  const deFicha = refs.filter((r) => esHrefFicha(r.href));
  if (pideFichas(pedido)) return deFicha.slice(0, 6);
  if (listaCortaDeEntidades(refs)) return [...refs];
  if (refs.length <= 4) return [...refs];
  return deFicha.slice(0, 4);
}