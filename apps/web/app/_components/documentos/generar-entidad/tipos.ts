import type { AmbitoPlantilla } from "@opai/domain";

/** Entidades sobre las que se genera un documento (CAR-315 parte 2): todo ámbito salvo la persona. */
export type TipoEntidad = Exclude<AmbitoPlantilla, "persona">;

/** Salida de `core.documento_plantillas.rellenar_entidad` que usa la pantalla. */
export type VistaRellenoEntidad = {
  plantilla: { id: string; nombre: string; clase: string; version: number };
  entidad: { tipo: TipoEntidad; id: string; nombre: string };
  parrafos: { texto: string; negrita: boolean; cursiva: boolean; faltante: string | null }[][];
  faltantes: { clave: string; etiqueta: string; motivo: string }[];
  puedeGenerar: boolean;
  firma: { nivel: string; firmantes: string };
};

export type PlantillaEntidad = { id: string; nombre: string; clase: string; tipo: string; activa: boolean };
