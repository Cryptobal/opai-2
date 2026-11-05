import {
  capacidadesDelNucleo,
  consumidorAvisoPrueba,
  consumidorSeguimientoCierre,
  consumidoresDelNucleo,
  limpiarConsumidores,
  limpiarModulos,
  limpiarRegistro,
  limpiarTrabajos,
  registrarCapacidades,
  registrarConsumidores,
  registrarModulos,
  registrarTrabajos,
  trabajoCobrosMesAnterior,
  trabajoCobrosPruebas,
  trabajosComercial,
  trabajosDelNucleo,
  trabajosFinanzas,
} from "@opai/capabilities";
import { consumidoresAsistencia, consumidorCpqBandeja, consumidorCpqEnlace, modulos, trabajosAgente, trabajosAsistencia, trabajosCpq } from "@opai/modules";

let hecho = false;

/**
 * Construye los registros del proceso: capacidades (núcleo + módulos), trabajos y consumidores de
 * eventos. Se ejecuta una vez por proceso; si Next recarga este archivo en desarrollo, se
 * reconstruye desde cero.
 */
export function asegurarRegistro(): void {
  if (hecho) return;
  limpiarRegistro();
  limpiarModulos();
  limpiarTrabajos();
  limpiarConsumidores();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos(modulos);
  registrarTrabajos([
    ...trabajosDelNucleo,
    ...trabajosFinanzas,
    ...trabajosComercial,
    ...trabajosAgente,
    ...trabajosAsistencia,
    ...trabajosCpq,
    trabajoCobrosMesAnterior,
    trabajoCobrosPruebas,
  ]);
  registrarConsumidores([
    ...consumidoresDelNucleo,
    ...consumidoresAsistencia,
    consumidorCpqBandeja,
    consumidorCpqEnlace,
    consumidorSeguimientoCierre,
    consumidorAvisoPrueba,
  ]);
  hecho = true;
}
