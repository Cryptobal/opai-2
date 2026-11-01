import { validarEstructuraCompleta } from "../capas-sueldo";
import { haberes, gratificacionLegal, vigenteEn, type Estructura } from "../estructuras";
import { entero } from "./aritmetica";
import type { EntradaCostoEmpleador } from "./contrato";
import { minimoPorJornada } from "./jornada";
import { indicadorUsado, type JuegoDeValores } from "./valores";

export function resolverSueldo(e: EntradaCostoEmpleador, juego: JuegoDeValores) {
  const imm = indicadorUsado(juego, "imm").valor;
  const minimo = minimoPorJornada(imm, e.jornadaMinutosSemanales, indicadorUsado(juego, "jornada").valor);
  const s = e.sueldo;
  const capa = "capa" in s ? s.capa : null;
  if (capa && (capa.nivel === "cargo" || !vigenteEn(capa, juego.fecha) || capa.estado !== "vigente"))
    throw new RangeError("Capa no vigente para el cálculo");
  if (capa) validarEstructuraCompleta(capa);
  const atada = "capa" in s ? s.baseAtadaImm : s.sueldoBaseClp === "imm";
  const estructura: Estructura = "capa" in s ? { ...s.capa, sueldoBase: atada ? minimo : s.capa.sueldoBase } : {
    id: "manual", nivel: "puesto", estado: "vigente", vigenteDesde: juego.fecha,
    sueldoBase: s.sueldoBaseClp === "imm" ? minimo : s.sueldoBaseClp,
    gratificacion: s.gratificacion, gratificacionMonto: s.gratificacionMontoClp ?? null,
    colacion: s.colacionClp, movilizacion: s.movilizacionClp, items: s.haberes,
  };
  validarEstructuraCompleta(estructura);
  if (!["legal_25", "monto_fijo", "ninguna"].includes(estructura.gratificacion ?? ""))
    throw new RangeError("Modalidad de gratificación inválida");
  for (const n of [estructura.sueldoBase, estructura.colacion, estructura.movilizacion])
    entero(n ?? -1, "Concepto CLP", 0, 100_000_000);
  if (estructura.gratificacion === "monto_fijo") entero(estructura.gratificacionMonto ?? -1, "Gratificación", 0, 100_000_000);
  for (const i of estructura.items) {
    if (!["bono_fijo", "bono_porcentual"].includes(i.tipo)) throw new RangeError("Tipo de bono inválido");
    entero(i.tipo === "bono_fijo" ? i.monto ?? -1 : i.porcentaje ?? -1, "Bono", 0,
      i.tipo === "bono_fijo" ? 100_000_000 : 1_000_000);
  }
  let h = haberes(estructura, imm);
  // DT, La Gratificación Legal, sistema art. 50: remuneraciones mensuales, incluidos bonos.
  if (estructura.gratificacion === "legal_25" && h.bonosImponibles > 0) {
    estructura.gratificacion = "monto_fijo";
    estructura.gratificacionMonto = gratificacionLegal(h.sueldoBase + h.bonosImponibles, imm);
    h = haberes(estructura, imm);
  }
  return { haberes: h, capa, minimo, atada };
}
