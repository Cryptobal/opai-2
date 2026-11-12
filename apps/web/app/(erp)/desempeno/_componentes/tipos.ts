// Tipos y textos compartidos entre servidor y cliente (sin código de servidor).
export type ItemScorecard = { indicador: string; meta: number; peso: number };

export type Scorecard = {
  id: string;
  cargoId: string;
  vigenteDesde: string;
  estado: "borrador" | "publicado";
  personaVeResultado: boolean;
  personaVeRanking: boolean;
  sumaPesos: number;
  indicadores: ItemScorecard[];
};

export type DefinicionIndicador = { indicador: string; nombre: string; descripcion: string; unidad: string };

export type IndicadorOpcion = {
  id: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  metaSugerida: number;
};

export type CargoJefatura = {
  id: string;
  nombre: string;
  activo: boolean;
  jefaturaCargoId: string | null;
  jefaturaVe: "asignadas" | "equipo" | "instalaciones";
};

export const ETIQUETA_VE: Record<CargoJefatura["jefaturaVe"], string> = {
  asignadas: "Solo a las personas que tiene asignadas",
  equipo: "A todo el equipo de este cargo",
  instalaciones: "A las personas de sus instalaciones a cargo",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11" → "nov 2026". */
export function mesCorto(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  return `${MESES[Number(mes) - 1] ?? mes} ${anio}`;
}

const numero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

/** Valor en la unidad del indicador: "12", "85 %", "$ 1.200.000", "3,5 UF", "4 h", "2 días". */
export function conUnidad(valor: number, unidad: string | null): string {
  const n = numero.format(valor);
  if (unidad === "porcentaje") return `${n} %`;
  if (unidad === "clp") return `$ ${n}`;
  if (unidad === "uf") return `${n} UF`;
  if (unidad === "horas") return `${n} h`;
  if (unidad === "dias") return `${n} días`;
  return n;
}

export type UsoHecho = { hecho: string; filtros?: Record<string, string[]> };

export type DefinicionPropio =
  | ({ forma: "contar" } & UsoHecho)
  | ({ forma: "sumar"; monto: string } & UsoHecho)
  | { forma: "tiempo"; desde: UsoHecho; hasta: UsoHecho; unidad: "horas" | "dias" }
  | { forma: "porcentaje"; parte: UsoHecho; total: UsoHecho };

export type Propio = {
  id: string;
  indicador: string;
  nombre: string;
  descripcion: string | null;
  sentido: "mayor" | "menor";
  metaSugerida: number;
  unidad: string;
  vigenteDesde: string;
  estado: "borrador" | "publicado";
  archivado: boolean;
  definicion: DefinicionPropio;
  /** Cambio guardado que rige más adelante (borrador o publicado); el editor parte de él. */
  pendiente: {
    vigenteDesde: string;
    estado: "borrador" | "publicado";
    sentido: "mayor" | "menor";
    metaSugerida: number;
    unidad: string;
    definicion: DefinicionPropio;
  } | null;
};

export type Hecho = {
  id: string;
  modulo: string;
  nombre: string;
  descripcion: string;
  sujeto: string;
  entidad: string;
  montos: { id: string; unidad: string }[];
  puedeUsar: boolean;
};

export type VistaPrevia = {
  periodo: string;
  sujetos: number;
  minimo: number | null;
  maximo: number | null;
  promedio: number | null;
};

export const ETIQUETA_FORMA: Record<DefinicionPropio["forma"], string> = {
  contar: "Cuenta cuántas veces pasa",
  sumar: "Suma un monto",
  tiempo: "Tiempo entre dos hechos",
  porcentaje: "Porcentaje de un hecho sobre otro",
};
