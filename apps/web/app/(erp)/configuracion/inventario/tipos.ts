export type PrendaConfig = { clave: string; nombre: string; activo: boolean; orden: number; enUso: boolean };

export type CategoriaConfig = {
  clave: string;
  nombre: string;
  comportamiento: "activo" | "ropa";
  activo: boolean;
  orden: number;
};

export type TabInventarioConfig = "prendas" | "categorias";