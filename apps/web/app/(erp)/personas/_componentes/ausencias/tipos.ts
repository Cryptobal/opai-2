export const TIPOS_AUSENCIA = [
  { valor: "licencia", etiqueta: "Licencia médica" },
  { valor: "permiso", etiqueta: "Permiso" },
  { valor: "vacaciones", etiqueta: "Vacaciones" },
  { valor: "ausencia", etiqueta: "Ausencia" },
] as const;

export type TipoAusencia = (typeof TIPOS_AUSENCIA)[number]["valor"];

export const etiquetaTipo = (t: string) => TIPOS_AUSENCIA.find((x) => x.valor === t)?.etiqueta ?? t;

export type GrupoAusencia = {
  tipo: TipoAusencia;
  motivo: string;
  desde: string;
  hasta: string;
  dias: number;
  estado: "activa" | "anulada";
  registradaEn: string;
  instalaciones: string[];
};
