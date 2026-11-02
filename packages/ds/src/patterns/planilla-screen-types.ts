import type { ReactNode } from "react";

import type { EstadoPantalla, TextosEstado } from "./estado";

export type TonoCelda = "neutro" | "success" | "warning" | "danger" | "info" | "accent";
export type Celda = { texto: string; tono?: TonoCelda; detalle?: string };
export type FilaPlanilla = { id: string; etiqueta: string; sub?: string };
export type ColumnaPlanilla = { id: string; etiqueta: string; destacada?: boolean };

export type PlanillaScreenProps = {
  state: EstadoPantalla;
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  /** Muestra acciones también en escritorio (1280+), no solo en teléfono. */
  accionesSiempre?: boolean;
  /** Cabecera de título/subtítulo solo en teléfono; acciones en menú aparte. */
  cabeceraSoloTelefono?: boolean;
  filas: readonly FilaPlanilla[];
  columnas: readonly ColumnaPlanilla[];
  celda: (filaId: string, columnaId: string) => Celda | null;
  /** Si se define, indica qué celdas de datos admiten edición (incluidas vacías). */
  celdaEditable?: (filaId: string, columnaId: string) => boolean;
  textos?: TextosEstado;
  /** Si se define, se invoca al tocar una celda editable (además del zoom en móvil). */
  onCelda?: (filaId: string, columnaId: string) => void;
};

/* Códigos de turno del diseño: D info, N acento, L libre (sin fondo), V success, X danger (sin cubrir). */
export const TONO: Record<TonoCelda, string> = {
  neutro: "bg-transparent text-fg-subtle font-normal",
  success: "bg-success-muted text-success-fg",
  warning: "bg-warning-muted text-warning-fg",
  danger: "bg-danger-muted text-danger-fg shadow-[inset_0_0_0_1px_var(--ds-danger)]",
  info: "bg-info-muted text-info-fg",
  accent: "bg-accent-muted text-accent",
};

export const claseCeldaNumero =
  "min-h-9 min-w-[7.5rem] whitespace-nowrap tabular-nums text-xs font-medium";

export type SeleccionPlanilla = {
  fila: FilaPlanilla;
  columna: ColumnaPlanilla;
  celda: Celda;
};
