import { jsonCanonico, sha256Hex } from "../canon";
import { vigenteEn } from "../estructuras";
import { congelar, entero, fechaValida } from "./aritmetica";
import { CLAVES_INDICADORES, type Indicador, type ValorIndicador } from "./indicadores";
import { validarValor } from "./valores-validacion";

export class ValorLegalFaltante extends Error {
  readonly codigo = "VALOR_LEGAL_FALTANTE";
  constructor(readonly indicador: Indicador, readonly fecha: string) {
    super(`Falta ${indicador} para ${fecha}`);
  }
}
export type JuegoDeValores = Readonly<{
  fecha: string; huella: string; valores: readonly ValorIndicador[]; advertencias: readonly string[];
}>;

export function sinFuenteNoHayInvento<K extends Indicador>(
  fecha: string, valores: readonly ValorIndicador[], indicador: K,
): ValorIndicador<K> {
  const candidatos = valores.filter((v) => v.indicador === indicador && v.estado === "vigente" && v.vigenteDesde <= fecha);
  const vigentes = candidatos.filter((v) => vigenteEn(v, fecha));
  const ordenados = (vigentes.length ? vigentes : candidatos).sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde));
  const elegido = ordenados[0];
  if (!elegido) throw new ValorLegalFaltante(indicador, fecha);
  if (ordenados[1]?.vigenteDesde === elegido.vigenteDesde) throw new RangeError(`Vigencia ambigua: ${indicador}`);
  return elegido as ValorIndicador<K>;
}

/** Foto independiente e inmutable; SHA-256 canónico compartido con el dominio. */
export async function juegoDeValores(fecha: string, valores: readonly ValorIndicador[]): Promise<JuegoDeValores> {
  fechaValida(fecha);
  valores.forEach(validarValor);
  const seleccionados = CLAVES_INDICADORES.map((k) => sinFuenteNoHayInvento(fecha, valores, k));
  const copia = JSON.parse(jsonCanonico(seleccionados)) as ValorIndicador[];
  const advertencias = copia.flatMap((v) => {
    const atrasado = !vigenteEn(v, fecha) || (v.indicador === "uf" && v.vigenteDesde !== fecha) ||
      (v.indicador === "utm" && v.vigenteDesde.slice(0, 7) !== fecha.slice(0, 7));
    return [
      ...(atrasado ? [`${v.indicador}: se usa el último valor del ${v.vigenteDesde}; falta publicación para ${fecha}`] : []),
      ...(v.verificacion === "por_verificar" ? [`${v.indicador}: fuente por verificar`] : []),
      ...(valores.some((p) => p.indicador === v.indicador && p.estado === "retenido" && vigenteEn(p, fecha))
        ? [`${v.indicador}: valor en revisión`] : []),
    ];
  });
  const foto = { fecha, valores: copia, advertencias };
  return congelar({ ...foto, huella: await sha256Hex(jsonCanonico(foto)) });
}

export function indicadorUsado<K extends Indicador>(juego: JuegoDeValores, clave: K): ValorIndicador<K> {
  return sinFuenteNoHayInvento(juego.fecha, juego.valores, clave);
}

/** Comparar observaciones consecutivas del día/mes (el capturador verifica la periodicidad). */
export function valorAnomalo(tipo: "uf" | "utm" | "tasa" | "imm", anterior: number, nuevo: number): boolean {
  entero(anterior, "Valor anterior"); entero(nuevo, "Valor nuevo");
  if (tipo === "imm") return nuevo < anterior;
  const umbral = tipo === "uf" ? 1 : tipo === "utm" ? 3 : 20;
  return BigInt(Math.abs(nuevo - anterior)) * 100n > BigInt(anterior) * BigInt(umbral);
}
