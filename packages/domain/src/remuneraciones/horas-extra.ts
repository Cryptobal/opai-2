import { entero, razonClp } from "./aritmetica";
import { minimoPorJornada } from "./jornada";

/** R19: base/30 × 28/(4×jornada) × 1,5. Jornada y cantidad en minutos. */
export function horasExtraClp(entrada: {
  sueldoBaseClp: number; immClp: number; jornadaLegalHoras: number;
  jornadaMinutosSemanales: number; minutosExtra: number;
}) {
  const e = entrada;
  entero(e.sueldoBaseClp, "Sueldo base"); entero(e.minutosExtra, "Minutos extra");
  const minimo = minimoPorJornada(e.immClp, e.jornadaMinutosSemanales, e.jornadaLegalHoras);
  return razonClp([Math.max(e.sueldoBaseClp, minimo), 28, 3, e.minutosExtra],
    [30, 4, e.jornadaMinutosSemanales, 2]);
}
