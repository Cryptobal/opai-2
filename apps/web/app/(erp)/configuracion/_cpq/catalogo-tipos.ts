export type CategoriaCatalogo = {
  id: string;
  clave: string;
  nombre: string;
  clase: "directo" | "indirecto";
  activa: boolean;
  orden: number;
};

export type ItemCatalogo = {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string;
  unidad: string;
  /** Solo con `cpq:costos.ver`. */
  costoUnitarioClp?: number;
  recurrencia: "mensual" | "unico";
  visibleCliente: boolean;
  porDefecto: boolean;
  activo: boolean;
};
