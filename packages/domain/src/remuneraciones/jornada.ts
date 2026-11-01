import { UF_ESCALA } from "../dinero";
import { entero, razonClp } from "./aritmetica";

export function minimoPorJornada(immClp: number, jornadaMinutos: number, jornadaLegalHoras: number) {
  entero(immClp, "IMM", 1); entero(jornadaMinutos, "Jornada pactada", 1, 168 * 60);
  entero(jornadaLegalHoras, "Jornada legal", 1, 168);
  return jornadaMinutos <= 30 * 60
    ? razonClp([immClp, jornadaMinutos], [jornadaLegalHoras, 60])
    : razonClp([immClp], [1]);
}

/** Plan UF y valor diario en centavos, sin paso intermedio en CLP fraccionarios. */
export function montoUfClp(cantidadUf: number, ufCentavos: number) {
  return razonClp([cantidadUf, ufCentavos], [UF_ESCALA, 100]);
}
