export type Propuesta = {
  id: string;
  clave: string;
  nombre: string;
  valorPropuesto: unknown;
  valorVigente: unknown;
  vigenteDesde: string;
  fuente: string;
  consultadaEl: string | null;
};
export type CapturaIndicador = {
  clave: string;
  capturadoEn: string;
  resultado: string;
  motivo: string | null;
  alerta: boolean;
};
export type DatosIndicadores = { propuestas: Propuesta[]; capturas: CapturaIndicador[] };

export const NOMBRE_INDICADOR: Record<string, string> = {
  imm: "Ingreso mínimo",
  topes: "Topes imponibles",
  afp: "AFP",
  sis: "Seguro de invalidez (SIS)",
  cesantia: "Seguro de cesantía",
};

export const MOTIVO_FALLA: Record<string, string> = {
  fuente_caida: "Previred no respondió; se mantiene el último valor.",
  sin_lectura: "No se pudo leer el valor en la página; se mantiene el último valor.",
  sin_vigente_valido:
    "El valor vigente no tiene la forma esperada; no se compara ni se propone nada.",
  fuera_de_banda: "El valor leído se aleja demasiado del vigente; se descartó por seguridad.",
  publicacion: "No se pudo guardar la lectura; se mantiene el último valor.",
};

/** Valor tal como lo guarda la base (tasas y topes escalados), legible en una tarjeta. */
const legibleClave = (k: string) =>
  k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();

/** Filas «dato → valor» de un valor legal (objetos anidados con «a · b»), para mostrarlo como tabla. */
export function filasValor(v: unknown, prefijo = ""): [string, string][] {
  if (v === null || v === undefined) return [[prefijo || "Valor", "—"]];
  if (typeof v !== "object") return [[prefijo || "Valor", String(v)]];
  if (Array.isArray(v))
    return v.flatMap((x, i) => filasValor(x, `${prefijo}${prefijo ? " · " : ""}${i + 1}`));
  const filas = Object.entries(v as Record<string, unknown>).flatMap(([k, x]) =>
    filasValor(x, `${prefijo}${prefijo ? " · " : ""}${legibleClave(k)}`),
  );
  return filas.length ? filas : [[prefijo || "Valor", "—"]];
}
