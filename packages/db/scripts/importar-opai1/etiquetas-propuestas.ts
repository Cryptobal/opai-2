// Etiquetas propuestas desde los campos de texto libre de las cuentas de 1.0 (rubro, segmento, tamaño).
import { ordenEstable } from "./comun";
import { nombreCanonico, textoLimpio } from "./normalizar";
import type { EtiquetaPropuesta } from "./plan";
import type { DatosOpai1 } from "./origen";

const GRUPOS = [
  ["Rubro", "industry"],
  ["Segmento", "segment"],
  ["Tamaño", "size"],
] as const;

/** Valores distintos por grupo (agrupados por forma canónica; gana la primera escritura vista). */
export function etiquetasPropuestas(origen: DatosOpai1): EtiquetaPropuesta[] {
  const salida: EtiquetaPropuesta[] = [];
  for (const [grupo, campo] of GRUPOS) {
    const valores = new Map<string, EtiquetaPropuesta>();
    for (const cuenta of ordenEstable(origen.accounts)) {
      const valor = textoLimpio(cuenta[campo]);
      if (!valor) continue;
      const clave = nombreCanonico(valor);
      const actual = valores.get(clave);
      if (actual) actual.filas += 1;
      else valores.set(clave, { grupo, valor, filas: 1 });
    }
    salida.push(...[...valores.values()].sort((a, b) => a.valor.localeCompare(b.valor)));
  }
  return salida;
}
