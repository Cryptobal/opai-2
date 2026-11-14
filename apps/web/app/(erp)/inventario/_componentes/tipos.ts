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

export const CATEGORIAS = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "ropa", etiqueta: "Ropa" },
];

export const etiquetaCategoria = (v: string) => CATEGORIAS.find((c) => c.valor === v)?.etiqueta ?? v;
