export const TIPOS_AUSENCIA = [
  { valor: "licencia", etiqueta: "Licencia médica" },
  { valor: "permiso", etiqueta: "Permiso" },
  { valor: "vacaciones", etiqueta: "Vacaciones" },
  { valor: "ausencia", etiqueta: "Ausencia" },
] as const;

export type TipoAusencia = (typeof TIPOS_AUSENCIA)[number]["valor"];

export const etiquetaTipo = (t: string) => TIPOS_AUSENCIA.find((x) => x.valor === t)?.etiqueta ?? t;

export type GrupoAusencia = {
  ausenciaId: string;
  tipo: TipoAusencia;
  motivo: string;
  clase: string | null;
  desde: string;
  hasta: string;
  dias: number;
  estado: "activa" | "anulada";
  registradaEn: string;
  instalaciones: string[];
};

/** Clase del catálogo de la empresa (CAR-393 parte 3), ligada a un tipo base. */
export type ClaseAusencia = { nombre: string; tipo: TipoAusencia };
