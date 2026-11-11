import type { ClasePlantilla, FirmantesPlantilla, NivelPlantilla } from "@opai/domain";

/** Salida de `core.documento_plantillas.get` (y de guardar/publicar) que usa el editor 06. */
export type PlantillaEditor = {
  id: string;
  nombre: string;
  clase: ClasePlantilla;
  tipo: string;
  nivelFirma: NivelPlantilla;
  firmantes: FirmantesPlantilla;
  origen: "creada" | "word" | "pdf";
  versionVigente: number;
  activa: boolean;
  ultimaEdicionPor: string | null;
  ultimaEdicionEn: string | null;
  contenido: string;
  borrador: { contenido: string; actualizadoEn: string; porNombre: string | null } | null;
  desconocidas: string[];
};

export const ORIGEN_PLANTILLA: Record<PlantillaEditor["origen"], string> = {
  creada: "Creada en OPAI",
  word: "Importada de Word",
  pdf: "Importada de PDF",
};
