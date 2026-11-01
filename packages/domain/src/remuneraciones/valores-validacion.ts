import { PCT_ESCALA } from "../dinero";
import { entero, fechaValida } from "./aritmetica";
import { AFP, type ValorIndicador } from "./indicadores";

export function validarValor(v: ValorIndicador): void {
  fechaValida(v.vigenteDesde);
  if (v.vigenteHasta) {
    fechaValida(v.vigenteHasta);
    if (v.vigenteHasta < v.vigenteDesde) throw new RangeError("Vigencia invertida");
  }
  if (!v.fuente.trim()) throw new RangeError("Falta fuente del indicador");
  if (v.consultadaEl) fechaValida(v.consultadaEl);
  if (v.verificacion === "verificado" && !v.consultadaEl) throw new RangeError("Falta fecha de consulta");
  const tasa = (n: number) => entero(n, "Tasa", 0, PCT_ESCALA);
  switch (v.indicador) {
    case "uf": case "utm": case "imm": entero(v.valor, v.indicador, 1); break;
    case "jornada": entero(v.valor, "Jornada legal", 1, 168); break;
    case "sis": tasa(v.valor); break;
    case "mutual": tasa(v.valor.basica); tasa(v.valor.sanna); tasa(v.valor.basica + v.valor.sanna); break;
    case "reforma":
      tasa(v.valor.tasa);
      if (typeof v.valor.incluyeSis !== "boolean") throw new RangeError("Reforma debe declarar si incluye SIS");
      break;
    case "topes":
      for (const n of [v.valor.pensionSaludUf, v.valor.ipsUf, v.valor.cesantiaUf, v.valor.indemnizacionUf])
        entero(n, "Tope UF", 1);
      break;
    case "afp":
      tasa(v.valor.obligatoria); tasa(v.valor.salud);
      for (const afp of AFP) {
        tasa(v.valor.comisiones[afp]); tasa(v.valor.obligatoria + v.valor.comisiones[afp]);
      }
      break;
    case "cesantia":
      for (const n of [v.valor.indefinidoEmpleador, v.valor.plazoFijoEmpleador, v.valor.indefinidoTrabajador]) tasa(n);
      break;
    case "impuesto": {
      if (!v.valor.length || v.valor.at(-1)?.hastaUtm !== null) throw new RangeError("Tabla de impuesto incompleta");
      let anterior = 0;
      for (const [i, tramo] of v.valor.entries()) {
        tasa(tramo.tasa); entero(tramo.rebajaUtm, "Rebaja UTM");
        if (tramo.hastaUtm === null) {
          if (i !== v.valor.length - 1) throw new RangeError("Tramo abierto debe ser el último");
        } else anterior = entero(tramo.hastaUtm, "Límite UTM", anterior + 1);
      }
    }
  }
}
