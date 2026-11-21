/** Fila de la lista «en sitio» / evacuación en portería (alineado con `core.terreno.en_sitio`). */
export type FilaEvacuacion = {
  id: string;
  clave: string;
  nombre: string;
  empresa: string | null;
  tipoRegistro: string;
  documento: string;
  entradaEn: string;
};

export type SnapshotEvacuacion = {
  /** Día calendario en America/Santiago (YYYY-MM-DD): al cambiar, la copia se borra (R26). */
  dia: string;
  sincronizadoEn: number;
  items: FilaEvacuacion[];
};