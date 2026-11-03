import { clp, type CLP } from "../dinero";
import type { EntradaCostoEmpleador, SueldoParaCostear } from "./contrato";
import { costoEmpleadorPorPersona } from "./costo-empresa";
import type { JuegoDeValores } from "./valores";

/** Tope de búsqueda del sueldo base (CLP): 20 millones, sobre cualquier sueldo operativo. */
export const TOPE_BRUTO_CLP = 20_000_000;

export type ResultadoLiquidoABruto = {
  /** Menor sueldo base entero cuyo líquido estimado alcanza el objetivo. */
  sueldoBaseClp: CLP;
  /** Líquido estimado con ese sueldo base (≥ objetivo, salvo `alcanzable: false`). */
  liquidoClp: CLP;
  /** Diferencia entre el líquido logrado y el objetivo (0 o algunos pesos por el redondeo legal). */
  diferenciaClp: CLP;
  /** false si ni el tope de búsqueda alcanza el objetivo. */
  alcanzable: boolean;
};

function conBase(entrada: EntradaCostoEmpleador, base: number): EntradaCostoEmpleador {
  if ("capa" in entrada.sueldo) throw new RangeError("Líquido → bruto solo con sueldo de entrada, no con capa");
  const sueldo: SueldoParaCostear = { ...entrada.sueldo, sueldoBaseClp: base };
  return { ...entrada, sueldo };
}

/**
 * Sueldo base (bruto) que da un líquido objetivo, con el mismo motor de costo empleador (AFP, salud,
 * cesantía, impuesto único, gratificación y no imponibles de la entrada). El líquido crece con el
 * sueldo base, así que una búsqueda binaria sobre enteros encuentra el menor base que lo alcanza:
 * sin float y determinista. Colación, movilización y bonos de la entrada se respetan tal cual.
 */
export function liquidoABruto(
  entrada: EntradaCostoEmpleador,
  liquidoObjetivoClp: number,
  juego: JuegoDeValores,
): ResultadoLiquidoABruto {
  if (!Number.isSafeInteger(liquidoObjetivoClp) || liquidoObjetivoClp < 0)
    throw new RangeError("Líquido objetivo inválido");
  const liquido = (base: number) => costoEmpleadorPorPersona(conBase(entrada, base), juego).liquidoEstimadoClp;
  const tope = liquido(TOPE_BRUTO_CLP);
  if (tope < liquidoObjetivoClp)
    return { sueldoBaseClp: clp(TOPE_BRUTO_CLP), liquidoClp: tope, diferenciaClp: clp(tope - liquidoObjetivoClp), alcanzable: false };
  let bajo = 0;
  let alto = TOPE_BRUTO_CLP;
  while (bajo < alto) {
    const medio = Math.floor((bajo + alto) / 2);
    if (liquido(medio) >= liquidoObjetivoClp) alto = medio;
    else bajo = medio + 1;
  }
  const logrado = liquido(bajo);
  return { sueldoBaseClp: clp(bajo), liquidoClp: logrado, diferenciaClp: clp(logrado - liquidoObjetivoClp), alcanzable: true };
}
