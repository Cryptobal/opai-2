// Tipos y textos de Inventario que usan las pantallas cliente y servidor (sin dependencias de servidor).

export type CampoTipo = {
  clave: string;
  etiqueta: string;
  tipo: "texto" | "numero" | "fecha";
  obligatorio: boolean;
};

export type TipoInventario = {
  id: string;
  categoria: "activo" | "ropa";
  nombre: string;
  descripcion: string | null;
  campos: CampoTipo[];
  tallas: string[];
  prendaClave: string | null;
  activo: boolean;
};

/** Prenda del uniforme de la empresa (CAR-408) a la que puede apuntar un tipo de ropa (CAR-504). */
export type PrendaKit = { clave: string; nombre: string };

export const CATEGORIAS = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "ropa", etiqueta: "Ropa" },
];

export const etiquetaCategoria = (v: string) => CATEGORIAS.find((c) => c.valor === v)?.etiqueta ?? v;

export type EstadoActivo = "disponible" | "asignado" | "en_reparacion" | "de_baja";

export type Activo = {
  id: string;
  tipoId: string;
  tipo: string;
  codigo: string;
  numeroSerie: string | null;
  estado: EstadoActivo;
  valores: Record<string, string | number>;
  notas: string | null;
  bajaEn: string | null;
  motivoBaja: string | null;
};

export type FichaActivo = Activo & { campos: CampoTipo[] };

export const ESTADOS_ACTIVO: { valor: EstadoActivo; etiqueta: string; tono: "success" | "info" | "warning" | "neutro" }[] = [
  { valor: "disponible", etiqueta: "Disponible", tono: "success" },
  { valor: "asignado", etiqueta: "Asignado", tono: "info" },
  { valor: "en_reparacion", etiqueta: "En reparación", tono: "warning" },
  { valor: "de_baja", etiqueta: "De baja", tono: "neutro" },
];

const DISPONIBLE = { valor: "disponible" as const, etiqueta: "Disponible", tono: "success" as const };
export const estadoActivo = (v: EstadoActivo) => ESTADOS_ACTIVO.find((e) => e.valor === v) ?? DISPONIBLE;

export type Prenda = {
  tipoId: string;
  nombre: string;
  activo: boolean;
  existencias: { talla: string; cantidad: number }[];
  total: number;
};

export type MovimientoRopa = {
  id: string;
  talla: string;
  delta: number;
  motivoEtiqueta: string;
  nota: string | null;
  fecha: string;
};

export type Entrega = {
  id: string;
  clase: "activo" | "ropa";
  item: string;
  activoId: string | null;
  cantidad: number | null;
  personaId: string | null;
  instalacionId: string | null;
  destino: string;
  nota: string | null;
  entregadaEn: string;
  devueltaEn: string | null;
};

export type Opcion = { valor: string; etiqueta: string; detalle?: string };
