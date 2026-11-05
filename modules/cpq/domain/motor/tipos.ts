export type Ambito = "tenant" | "cotizacion" | "linea";
export type Valores = Readonly<Record<string, number>>;
export type Unidad = "numero" | "clp" | "uf";
export type Variable = { clave: string; unidad: Unidad; escala: number; defecto: number };
export type Formula = { clave: string; expresion: string; unidad: Unidad };
export type Categoria = { id: string; nombre: string; clase: "directo" | "indirecto"; fija?: boolean | undefined };
export type Rateo = { tipo: "unico" } | { tipo: "contrato" } | { tipo: "meses"; meses: number };
export type Item = {
  id: string; categoria: string; costoUnitario: number; moneda: "CLP" | "UF";
  modo: "mensual_fijo" | "por_persona_mes" | "por_puesto_mes" | "inversion" | "formula";
  rateo: Rateo; formula?: string | undefined;
};
export type Instrumentos = {
  financiero: { habilitado: boolean; tasaPct: number };
  garantia: {
    habilitada: boolean; modo: "porcentaje" | "fija"; meses: number;
    contratoPct: number; tasaAnualPct: number; administracionPct: number;
    montoUf: number; incluirUnicos: boolean;
  };
  rc: {
    habilitada: boolean; modo: "prima" | "tasa"; primaAnualUf: number;
    aseguradoUf: number; tasaAnualPct: number; asignacionPct: number;
    plazo: "anual" | "contrato" | "meses"; meses: number;
  };
};
export type ModeloCosteo = {
  id: string; version: number; vertical: string; variables: readonly Variable[];
  formulas: readonly Formula[]; categorias: readonly Categoria[]; items: readonly Item[];
  valores: Valores; instrumentos: Instrumentos;
};
export type BaseLinea = { id: string; seccion: string; habilitada: boolean; variables: Valores };
export type Puesto = BaseLinea & {
  tipo: "puesto"; posiciones: number; patron: string; horaInicio: string; horaFin: string;
  diasCobertura: number;
  /** Definición del patrón configurado por la empresa; sin ella se busca entre los de fábrica. */
  patronDef?: { clase: string; diasTrabajo: number; diasDescanso: number; diasSemana: readonly number[] } | undefined;
  personasPorPosicionEscaladas?: number | undefined; motivoPersonas?: string | undefined;
};
export type LineaItem = BaseLinea & {
  tipo: "item" | "adicional"; item: Item; cantidadEscalada: number;
  costoUnitario?: number | undefined; rateo?: Rateo | undefined; margenPct: number;
  alcanceDotacion?: "cotizacion" | "seccion" | undefined;
};
/** Costo mensual manual por categoría (CLP entero): de un puesto (`puestoId`) o global de la cotización. */
export type AjusteCosto = { id: string; categoria: string; montoClp: number; puestoId?: string | undefined };
export type VersionCalculo = {
  numero: number; modeloId: string; modeloVersion: number; meses: number;
  margenPct: number; margenModo: "margen_sobre_venta" | "markup" | "margen_sobre_mano_de_obra";
  margenesSeccion?: readonly { seccion: string; margenPct: number }[] | undefined;
  precioManualClp?: number | undefined; variables: Valores; lineas: readonly (Puesto | LineaItem)[];
  instrumentos?: Instrumentos | undefined;
  /** Costos manuales por categoría; ausente o vacío = el cálculo de siempre. */
  ajustes?: readonly AjusteCosto[] | undefined;
};
export type ParametrosCalculo = {
  fecha: string; uf: { valorClpEscalado: number; fecha: string } | null;
  minimoPct: number; alertaPct: number;
};
export type VariableUsada = { clave: string; ambito: Ambito | "modelo" | "parametro"; valor: number | string };
export type Traza = { item: string; monto: string; formula: string; variables: readonly VariableUsada[]; valor: number; exacto: string };
export type LineaCalculada = { id: string; seccion: string; categoria: string; costoMensual: number; costoUnico: number; ventaAdicional: number; ventaUnica: number };
/** Snapshot puro del motor 07e: sin I/O. El adaptador real se cablea en otro PR. */
export interface ProveedorCostoEmpleador {
  obtener(entrada: { lineaId: string; fecha: string }): { costoMensualClp: number; origen: string } | null;
}
// Decisión de Carlos (1-nov-2026): esperar 07e/CAR-71; no hay entrada manual.
