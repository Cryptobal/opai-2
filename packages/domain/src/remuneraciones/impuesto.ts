import { PCT_ESCALA, UF_ESCALA, clp } from "../dinero";
import { entero, cocienteClp } from "./aritmetica";
import { indicadorUsado, type JuegoDeValores } from "./valores";

export function impuestoUnico(baseTributableClp: number, juego: JuegoDeValores) {
  entero(baseTributableClp, "Base tributable");
  const utm = indicadorUsado(juego, "utm").valor;
  const tramos = indicadorUsado(juego, "impuesto").valor;
  const tramo = tramos.find((t) => t.hastaUtm === null ||
    BigInt(baseTributableClp) * BigInt(UF_ESCALA) <= BigInt(t.hastaUtm) * BigInt(utm));
  if (!tramo) throw new RangeError("Falta tramo de impuesto");
  // La resta se hace ANTES del redondeo para evitar diferencias al peso.
  const n = BigInt(baseTributableClp) * BigInt(tramo.tasa) * BigInt(UF_ESCALA) -
    BigInt(tramo.rebajaUtm) * BigInt(utm) * BigInt(PCT_ESCALA);
  return { montoClp: n <= 0n ? clp(0) : cocienteClp(n, BigInt(PCT_ESCALA) * BigInt(UF_ESCALA)), tramo };
}
