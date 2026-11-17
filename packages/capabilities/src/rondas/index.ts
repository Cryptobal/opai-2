// Capacidades del módulo Rondas (Brief 14 · PR 1). Se exponen igual en UI, API /api/v1 y MCP
// (ADR-004, ADR-055). El manifest de modules/rondas las lista; el registro las da de alta al arrancar.
// La ejecución en terreno (iniciar/marcar/cerrar/novedad/emergencia) llega en el PR 3 con su
// excepción de paridad `soloPersonas`.
import type { Capacidad } from "../types";
import { ejecucionesLeer } from "./ejecuciones-leer";
import { ejecucionesListar } from "./ejecuciones-listar";
import { etiquetasPdf } from "./etiquetas";
import { informesCumplimiento } from "./informes-cumplimiento";
import { puntosReemplazarEtiqueta } from "./etiqueta-reemplazo";
import { incidentesTipoActualizar, incidentesTipoCrear, incidentesTipoListar } from "./incidentes-tipo";
import { plantillasActualizar, plantillasCrear } from "./plantillas-escritura";
import { plantillasListar } from "./plantillas-lectura";
import { programacionesFijar, programacionesPausar } from "./programaciones-escritura";
import { programacionesListar } from "./programaciones-lectura";
import { puntosActualizar, puntosArchivar, puntosCrear } from "./puntos-escritura";
import { puntosListar } from "./puntos-lectura";

export { ajustesRondas } from "./ajustes";
export { indicadoresRondas } from "./indicadores-gestion";

export const capacidadesRondas: readonly Capacidad[] = [
  ejecucionesListar,
  ejecucionesLeer,
  informesCumplimiento,
  puntosListar,
  puntosCrear,
  puntosActualizar,
  puntosArchivar,
  puntosReemplazarEtiqueta,
  plantillasListar,
  plantillasCrear,
  plantillasActualizar,
  programacionesListar,
  programacionesFijar,
  programacionesPausar,
  incidentesTipoListar,
  incidentesTipoCrear,
  incidentesTipoActualizar,
  etiquetasPdf,
];
