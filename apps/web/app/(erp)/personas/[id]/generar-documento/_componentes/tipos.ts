/** Salida de `core.documento_plantillas.rellenar` que usa la pantalla. */
export type VistaRelleno = {
  plantilla: { id: string; nombre: string; clase: string; version: number };
  persona: { id: string; nombre: string };
  parrafos: { texto: string; negrita: boolean; cursiva: boolean; faltante: string | null }[][];
  faltantes: { clave: string; etiqueta: string; motivo: string }[];
  puedeGenerar: boolean;
  firma: { nivel: string; firmantes: string };
};

export type PlantillaOpcion = { id: string; nombre: string; tipo: string };
