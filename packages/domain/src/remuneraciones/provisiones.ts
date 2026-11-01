import { PCT_ESCALA, clp } from "../dinero";
import type { Haberes } from "../estructuras";
import { entero, razonClp } from "./aritmetica";
import type { SupuestosProvisiones } from "./contrato";
import { montoUfClp } from "./jornada";
import { indicadorUsado, type JuegoDeValores } from "./valores";

export function calcularProvisiones(h: Haberes, p: SupuestosProvisiones, juego: JuegoDeValores) {
  entero(p.diasVacacionesCorridosAnuales, "Días de vacaciones", 0, 366);
  entero(p.mesesAntiguedad, "Antigüedad en meses");
  entero(p.probabilidadIndemnizacion, "Probabilidad indemnización", 0, PCT_ESCALA);
  const bases = { sueldo_base: h.sueldoBase, imponible: h.imponible,
    sin_gratificacion: clp(h.sueldoBase + h.bonosImponibles) };
  const baseVacacionesClp = bases[p.baseVacaciones];
  const tope = montoUfClp(indicadorUsado(juego, "topes").valor.indemnizacionUf, indicadorUsado(juego, "uf").valor);
  const baseIndemnizacionClp = clp(Math.min(bases[p.baseIndemnizacion], tope));
  return {
    baseVacacionesClp, baseIndemnizacionClp,
    vacacionesClp: razonClp([baseVacacionesClp, p.diasVacacionesCorridosAnuales], [30, 12]),
    indemnizacionClp: p.mesesAntiguedad >= 11 * 12 ? clp(0) :
      razonClp([baseIndemnizacionClp, p.probabilidadIndemnizacion], [12, PCT_ESCALA]),
  };
}
