import type { AmbitoPlantilla } from "@opai/domain";

/** Entidades sobre las que se genera un documento (CAR-315 parte 2): todo ámbito salvo la persona. */
export type TipoEntidad = Exclude<AmbitoPlantilla, "persona">;

type Parrafo = { texto: string; negrita: boolean; cursiva: boolean; faltante: string | null }[];
type Faltante = { clave: string; etiqueta: string; motivo: string };
type PlantillaVista = { id: string; nombre: string; clase: string; version: number };

/** Salida de `core.documento_plantillas.rellenar` que usa la pantalla de Personas. */
export type VistaRellenoPersona = {
  plantilla: PlantillaVista;
  persona: { id: string; nombre: string };
  parrafos: Parrafo[];
  faltantes: Faltante[];
  puedeGenerar: boolean;
  firma: { nivel: string; firmantes: string };
};

/** Salida de `core.documento_plantillas.rellenar_entidad` que usa la pantalla. */
export type VistaRellenoEntidad = {
  plantilla: PlantillaVista;
  entidad: { tipo: TipoEntidad; id: string; nombre: string };
  parrafos: Parrafo[];
  faltantes: Faltante[];
  puedeGenerar: boolean;
  firma: { nivel: string; firmantes: string };
};

export type PlantillaEntidad = {
  id: string;
  nombre: string;
  clase: string;
  tipo: string;
  activa: boolean;
};

/** Opción del selector en Personas (`core.documento_plantillas.list`). */
export type PlantillaOpcion = { id: string; nombre: string; tipo: string };
