// Tipos de las vistas laborales y de sueldo (salidas de core.vinculos.* y core.estructuras.*).

export type Nivel = "instalacion" | "puesto" | "persona";

export type Vinculo = {
  id: string;
  personaId: string;
  cargoId: string;
  tipo: string;
  inicio: string;
  termino: string | null;
  motivoTermino: string | null;
  estado: string;
};

export type ItemEstructura = {
  tipo: "bono_fijo" | "bono_porcentual";
  nombre: string;
  monto: number | null;
  porcentaje: number | null;
  imponible: boolean;
  tributable: boolean;
};

export type EstructuraVista = {
  id: string;
  nivel: Nivel | "cargo";
  instalacionId?: string | null;
  cargoId: string | null;
  puestoId: string | null;
  personaId: string | null;
  sensible: boolean;
  sueldoBase: number | null;
  colacion: number | null;
  movilizacion: number | null;
  gratificacion: string | null;
  gratificacionMonto: number | null;
  vigenteDesde: string;
  vigenteHasta: string | null;
  motivo: string | null;
  estado: string;
  items: ItemEstructura[];
};

export type Concepto = {
  clave: string;
  nombre: string;
  valores: Record<Nivel, unknown>;
  final: unknown;
  origen: Nivel | null;
};

export type SueldoEfectivo = {
  fecha: string;
  aplica: Nivel | null;
  niveles: Record<Nivel, EstructuraVista | null>;
  conceptos: Concepto[];
  haberes: Record<string, number> | null;
  capa: Nivel | null;
  estructura: EstructuraVista | null;
  estado: "sin_capa" | "incompleta" | "completa";
  conceptosFaltantes: string[];
};

export type PuestoDeCargo = {
  id: string;
  nombre: string;
  instalacionId: string;
  instalacion: string;
  cargoId: string;
  estado: string;
};

export const GRATIFICACION: Record<string, string> = {
  legal_25: "25 % con tope",
  monto_fijo: "Monto fijo",
  ninguna: "Sin gratificación",
};

export type SueldoVigente = {
  sueldoBase: number | null;
  colacion: number | null;
  movilizacion: number | null;
  gratificacion: string | null;
  vigenteDesde: string;
  sensible: boolean;
} | null;
