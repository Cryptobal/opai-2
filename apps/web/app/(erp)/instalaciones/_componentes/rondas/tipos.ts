import type { Gravedad, ModoPunto, OrdenPlantilla } from "@opai/domain";

/** Espejo del `puntoSchema` de `rondas.puntos.*` (no se importa el schema Zod en la UI). */
export type Punto = {
  id: string;
  instalacionId: string;
  nombre: string;
  modo: ModoPunto;
  estricto: boolean;
  latitud: number | null;
  longitud: number | null;
  radioM: number | null;
  precisionMinM: number | null;
  permanenciaS: number;
  etiquetaQr: string | null;
  exigeFoto: boolean;
  instrucciones: string | null;
  estado: "activo" | "archivado";
  creadoEn: string;
};

/** Punto dentro de una plantilla (orden y si es obligatorio). */
export type PlantillaPunto = { puntoId: string; orden: number; obligatorio: boolean };

/** Espejo del `plantillaSchema`. */
export type Plantilla = {
  id: string;
  instalacionId: string;
  nombre: string;
  ordenModo: OrdenPlantilla;
  tiempoMaxMin: number;
  tiempoMaxTramoMin: number | null;
  umbralIncompletaPct: number;
  permiteAdhoc: boolean;
  estado: "activo" | "archivado";
  puntos: PlantillaPunto[];
};

/** Hora "HH:MM" o intervalo "cada N min entre A y B". */
export type Horario = string | { cadaMin: number; desde: string; hasta: string };

/** Espejo del `programacionSchema`. */
export type Programacion = {
  id: string;
  instalacionId: string;
  plantillaId: string;
  nombre: string;
  horarios: Horario[];
  diasSemana: number[];
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  toleranciaMin: number;
  responsables: { modo: "personas" | "por_turno"; personaIds: string[] };
  estado: "activa" | "pausada";
};

/** Espejo del `tipoIncidenteSchema` (Configuración → Rondas, c15t). */
export type TipoIncidente = {
  id: string;
  nombre: string;
  icono: string | null;
  gravedadDefecto: Gravedad;
  activo: boolean;
  orden: number;
};

/** Defectos del tenant que heredan los puntos nuevos (herencia visible en el drawer, R1/R6). */
export type DefectosRondas = {
  modo: ModoPunto;
  radioM: number;
  precisionMinM: number;
  permanenciaGpsS: number;
  ordenPlantilla: OrdenPlantilla;
  umbralIncompletaPct: number;
};
