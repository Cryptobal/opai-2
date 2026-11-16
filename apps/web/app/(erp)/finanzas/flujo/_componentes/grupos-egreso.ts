export type GrupoEgreso = "remuneraciones" | "gastos" | "impuestos" | "financiamiento";

/** Grupos de egreso de la planilla, en el orden en que se muestran. Igual que `grupoEgresoSchema` del módulo Finanzas. */
export const GRUPOS_EGRESO: readonly { valor: GrupoEgreso; etiqueta: string }[] = [
  { valor: "remuneraciones", etiqueta: "Remuneraciones" },
  { valor: "gastos", etiqueta: "Gastos" },
  { valor: "impuestos", etiqueta: "Impuestos" },
  { valor: "financiamiento", etiqueta: "Financiamiento" },
];

export const GRUPO_POR_DEFECTO: GrupoEgreso = "gastos";
